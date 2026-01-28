import { useMemo, useRef, useState, useEffect } from 'react';
import { StepperV2 } from '../../ui/progress/StepperV2';
import { ProgressBarV2 } from '../../ui/progress/ProgressBarV2';
import { XmlUploadForm } from '../../ui/components/XmlUploadForm';
import { useToastV2 as useToast } from '../../ui/toast/useToastV2';
import ImportWorker from '../../workers/importWorker?worker';
import { IndexedDbService } from '../../data/services/IndexedDbService';
import type { MappedData } from '../../data/services/DataMapper';
import { XmlParser } from '../../data/services/XmlParser';
import { DataMapper } from '../../data/services/DataMapper';
import { buildInternalAndExternalLinks } from '../../analysis/links/linkExtractorV2';

const steps = [
  { id: 'upload', label: 'Upload XML' },
  { id: 'parse', label: 'Parse Data' },
  { id: 'save', label: 'Save to Database' },
  { id: 'complete', label: 'Complete' },
];

type ImportStats = {
  fileName?: string;
  fileSize?: number;
  startedAt?: number;
  parsedAt?: number;
  mappedAt?: number;
  savedAt?: number;
  counts?: {
    siteInfo: number;
    authors: number;
    categories: number;
    tags: number;
    posts: number;
    attachments: number;
    comments: number;
    postMeta: number;
  };
  preview?: {
    posts: string[];
    categories: string[];
    tags: string[];
    authors: string[];
  };
};

const UploadScreenV2 = () => {
  const [currentStep, setCurrentStep] = useState(steps[0].id);
  const [progress, setProgress] = useState(0);
  const { showToast } = useToast();
  const [worker, setWorker] = useState<Worker | null>(null);
  const [debugOpen, setDebugOpen] = useState(true);
  const [importStats, setImportStats] = useState<ImportStats>({});
  const [debugLog, setDebugLog] = useState<string[]>([]);
  const workerTimeoutRef = useRef<number | null>(null);
  const workerLastWorkRef = useRef<number | null>(null);
  const awaitingWorkRef = useRef(false);
  const pendingXmlRef = useRef<string | null>(null);

  const logDebug = (message: string) => {
    setDebugLog((prev) => [...prev, `${new Date().toLocaleTimeString()}  ${message}`]);
  };

  useEffect(() => {
    let newWorker: Worker | null = null;
    try {
      newWorker = new ImportWorker();
      setWorker(newWorker);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      showToast(`Worker unavailable, using main thread: ${message}`, 'info');
      logDebug(`Worker init failed: ${message}`);
      setWorker(null);
      return;
    }

    newWorker.onerror = (event) => {
      showToast(`Worker error: ${event.message || 'Unknown error'}`, 'error');
      logDebug(`Worker runtime error: ${event.message || 'Unknown error'}`);
      setWorker(null);
    };
    newWorker.onmessageerror = () => {
      showToast('Worker message error. Falling back to main thread.', 'error');
      logDebug('Worker message error.');
      setWorker(null);
    };

    newWorker.onmessage = (event: MessageEvent) => {
      const { type, payload } = event.data;
      switch (type) {
        case 'workerReady':
          logDebug('Worker ready.');
          break;
        case 'workerAck':
          logDebug('Worker acknowledged job.');
          break;
        case 'progress':
          setProgress(payload.percentage);
          setCurrentStep(payload.step);
          workerLastWorkRef.current = Date.now();
          logDebug(`Progress ${payload.percentage}% (${payload.step})`);
          break;
        case 'mappedData':
          workerLastWorkRef.current = Date.now();
          awaitingWorkRef.current = false;
          setImportStats((prev) => ({
            ...prev,
            parsedAt: prev.parsedAt ?? Date.now(),
            mappedAt: Date.now(),
          }));
          void handleMappedData(payload as MappedData);
          break;
        case 'importComplete':
          workerLastWorkRef.current = Date.now();
          awaitingWorkRef.current = false;
          setProgress(100);
          setCurrentStep('complete');
          showToast('Import complete!', 'success');
          logDebug('Import complete.');
          break;
        case 'importFailed':
          workerLastWorkRef.current = Date.now();
          awaitingWorkRef.current = false;
          showToast(`Import failed: ${payload?.message || payload}`, 'error');
          logDebug(`Import failed: ${payload?.message || payload}`);
          if (payload?.stack) {
            logDebug(payload.stack);
          }
          break;
        default:
          console.warn('Unknown message from worker:', type);
          logDebug(`Unknown worker message: ${type}`);
      }
    };

    return () => {
      if (workerTimeoutRef.current) {
        window.clearTimeout(workerTimeoutRef.current);
        workerTimeoutRef.current = null;
      }
      newWorker?.terminate();
    };
  }, [showToast]);

  const handleMappedData = async (mappedData: MappedData) => {
    setCurrentStep('save');
    setProgress(60);
    try {
      const dbService = new IndexedDbService();
      await dbService.openDatabase();
      await dbService.clearAllData();

      logDebug('Saving mapped data to IndexedDB.');
      await dbService.addData('siteInfo', mappedData.siteInfo);
      await dbService.addData('authors', mappedData.authors);
      await dbService.addData('categories', mappedData.categories);
      await dbService.addData('tags', mappedData.tags);
      await dbService.addData('posts', mappedData.posts);
      await dbService.addData('attachments', mappedData.attachments);
      await dbService.addData('comments', mappedData.comments);
      await dbService.addData('postMeta', mappedData.postMeta);

      setProgress(80);
      logDebug('Building internal/external links.');
      const siteUrl = mappedData.siteInfo.find((info) => info.Key === 'link')?.Value || '';
      const linkData = buildInternalAndExternalLinks(mappedData.posts, siteUrl);
      const normalizedInternal = linkData.internalLinks.map(({ Id, ...rest }) => rest);
      const normalizedExternal = linkData.externalLinks.map(({ Id, ...rest }) => rest);
      await dbService.addData('internalLinks', normalizedInternal);
      await dbService.addData('externalLinks', normalizedExternal);

      setImportStats((prev) => ({
        ...prev,
        savedAt: Date.now(),
        counts: {
          siteInfo: mappedData.siteInfo.length,
          authors: mappedData.authors.length,
          categories: mappedData.categories.length,
          tags: mappedData.tags.length,
          posts: mappedData.posts.length,
          attachments: mappedData.attachments.length,
          comments: mappedData.comments.length,
          postMeta: mappedData.postMeta.length,
        },
        preview: {
          posts: mappedData.posts.slice(0, 5).map((post) => post.Title),
          categories: mappedData.categories.slice(0, 5).map((cat) => cat.Name),
          tags: mappedData.tags.slice(0, 5).map((tag) => tag.Name),
          authors: mappedData.authors.slice(0, 5).map((author) => author.DisplayName),
        },
      }));

      setProgress(100);
      setCurrentStep('complete');
      showToast('Import complete!', 'success');
      logDebug('IndexedDB save complete.');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      showToast(`Import failed: ${message}`, 'error');
      logDebug(`Save failed: ${message}`);
    }
  };

  const runImportInMainThread = async (xmlString: string) => {
    try {
      setCurrentStep('parse');
      setProgress(10);
      const xmlParser = new XmlParser();
      const parsedXml = xmlParser.parse(xmlString);
      setProgress(40);
      setImportStats((prev) => ({ ...prev, parsedAt: Date.now() }));
      const mapper = new DataMapper();
      const mappedData = mapper.map(parsedXml);
      setImportStats((prev) => ({ ...prev, mappedAt: Date.now() }));
      await handleMappedData(mappedData);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      showToast(`Import failed: ${message}`, 'error');
      logDebug(`Main-thread import failed: ${message}`);
    }
  };

  const handleFileUpload = async (file: File) => {
    showToast('Upload started!', 'info');
    setCurrentStep('parse');
    setProgress(0);
    setDebugLog([]);
    setImportStats({
      fileName: file.name,
      fileSize: file.size,
      startedAt: Date.now(),
    });
    logDebug(`Selected file: ${file.name} (${Math.round(file.size / 1024)} KB)`);
    const xmlString = await file.text();
    pendingXmlRef.current = xmlString;
    logDebug('File loaded into memory.');
    if (worker) {
      if (workerTimeoutRef.current) {
        window.clearTimeout(workerTimeoutRef.current);
      }
      workerLastWorkRef.current = null;
      awaitingWorkRef.current = true;
      worker.postMessage({ type: 'startImport', payload: { xmlString } });
      logDebug('Dispatched XML to worker.');
      workerTimeoutRef.current = window.setTimeout(() => {
        const last = workerLastWorkRef.current;
        if (awaitingWorkRef.current && (!last || Date.now() - last > 1500)) {
          logDebug('Worker timed out. Falling back to main thread.');
          awaitingWorkRef.current = false;
          try {
            worker.terminate();
          } catch {
            // no-op
          }
          setWorker(null);
          if (pendingXmlRef.current) {
            void runImportInMainThread(pendingXmlRef.current);
          }
        }
      }, 1500);
    } else {
      await runImportInMainThread(xmlString);
    }
  };

  const duration = useMemo(() => {
    if (!importStats.startedAt || !importStats.savedAt) return null;
    return Math.max(0, importStats.savedAt - importStats.startedAt);
  }, [importStats.startedAt, importStats.savedAt]);

  return (
    <div className="upload-screen">
      <div className="upload-hero">
        <div>
          <h2>Upload WordPress XML</h2>
          <p>Parse WXR exports locally, then explore posts, tags, and metadata instantly.</p>
        </div>
        <div className="upload-badge">Local-only</div>
      </div>
      <StepperV2 steps={steps} currentStep={currentStep} />
      <ProgressBarV2 progress={progress} />
      <XmlUploadForm onFileUpload={handleFileUpload} />

      <section className="debug-panel">
        <div className="debug-header">
          <div>
            <h3>Live Import Diagnostics</h3>
            <p>Real-time visibility into parsing, mapping, and persistence.</p>
          </div>
          <button className="btn-secondary" onClick={() => setDebugOpen((prev) => !prev)}>
            {debugOpen ? 'Hide' : 'Show'}
          </button>
        </div>

        {debugOpen && (
          <div className="debug-grid">
            <div className="debug-card">
              <h4>Import Snapshot</h4>
              <div className="debug-stat">File: {importStats.fileName ?? '—'}</div>
              <div className="debug-stat">
                Size: {importStats.fileSize ? `${Math.round(importStats.fileSize / 1024)} KB` : '—'}
              </div>
              <div className="debug-stat">
                Duration: {duration ? `${(duration / 1000).toFixed(2)}s` : '—'}
              </div>
              <div className="debug-stat">
                Stage: {currentStep} ({progress}%)
              </div>
            </div>

            <div className="debug-card">
              <h4>Counts</h4>
              <div className="debug-metrics">
                <span>Posts: {importStats.counts?.posts ?? 0}</span>
                <span>Categories: {importStats.counts?.categories ?? 0}</span>
                <span>Tags: {importStats.counts?.tags ?? 0}</span>
                <span>Authors: {importStats.counts?.authors ?? 0}</span>
                <span>Attachments: {importStats.counts?.attachments ?? 0}</span>
                <span>Comments: {importStats.counts?.comments ?? 0}</span>
                <span>Post Meta: {importStats.counts?.postMeta ?? 0}</span>
              </div>
            </div>

            <div className="debug-card">
              <h4>Preview</h4>
              <div className="debug-preview">
                <div>
                  <strong>Posts</strong>
                  <ul>
                    {(importStats.preview?.posts ?? []).map((post) => (
                      <li key={post}>{post}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <strong>Categories</strong>
                  <ul>
                    {(importStats.preview?.categories ?? []).map((category) => (
                      <li key={category}>{category}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <strong>Tags</strong>
                  <ul>
                    {(importStats.preview?.tags ?? []).map((tag) => (
                      <li key={tag}>{tag}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <strong>Authors</strong>
                  <ul>
                    {(importStats.preview?.authors ?? []).map((author) => (
                      <li key={author}>{author}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            <div className="debug-card debug-log">
              <h4>Event Log</h4>
              <div className="debug-log-list">
                {debugLog.length === 0 ? (
                  <span>No events yet.</span>
                ) : (
                  debugLog.map((entry, index) => <div key={`${entry}-${index}`}>{entry}</div>)
                )}
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
};

export default UploadScreenV2;
