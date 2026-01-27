import { useEffect, useMemo, useState } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { IndexedDbService } from '../../data/services/IndexedDbService';
import { buildGraphData, GraphData } from '../../analysis/graph/GraphDataService';
import { Post } from '../../core/domain/types/Post';
import { InternalLink } from '../../core/domain/types/InternalLink';

const KnowledgeGraphScreenV2 = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [links, setLinks] = useState<InternalLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [graphWidth, setGraphWidth] = useState(900);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const db = new IndexedDbService();
      await db.openDatabase();
      const [loadedPosts, internalLinks] = await Promise.all([db.getPosts(), db.getInternalLinks()]);
      setPosts(loadedPosts);
      setLinks(internalLinks);
      setLoading(false);
    };
    void load();
  }, []);

  useEffect(() => {
    const updateWidth = () => {
      const width = Math.max(320, Math.min(1100, window.innerWidth - 360));
      setGraphWidth(width);
    };
    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  const graphData = useMemo<GraphData>(() => buildGraphData(posts, links), [posts, links]);

  const downloadGraphJson = () => {
    const blob = new Blob([JSON.stringify(graphData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `knowledge-graph-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return <div>Building knowledge graph...</div>;
  }

  const topCategory = useMemo(() => {
    const counts = new Map<string, number>();
    graphData.nodes.forEach((node) => {
      counts.set(node.group, (counts.get(node.group) || 0) + 1);
    });
    const sorted = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
    return sorted[0]?.[0] || 'n/a';
  }, [graphData.nodes]);

  return (
    <div className="knowledge-graph">
      <div className="graph-header">
        <div>
          <h2>Knowledge Graph</h2>
          <p>Inspect internal linking strength before exporting to BlogCMS.</p>
        </div>
        <button className="btn-secondary" onClick={downloadGraphJson}>
          Download Graph JSON
        </button>
      </div>

      <div className="graph-summary">
        <span>Nodes: {graphData.nodes.length}</span>
        <span>Links: {graphData.links.length}</span>
        <span>Top category: {topCategory}</span>
      </div>

      <div className="graph-preview">
        <h3>Sample Nodes</h3>
        <div className="graph-grid">
          {graphData.nodes.slice(0, 8).map((node) => (
            <div key={node.id} className="graph-card">
              <div className="graph-title">{node.name || 'Untitled'}</div>
              <div className="graph-meta">/{node.slug || 'no-slug'}</div>
              <div className="graph-meta">Words: {node.value * 200}</div>
              <div className="graph-meta">Category: {node.group}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="graph-canvas">
        <h3>Interactive Graph</h3>
        <div className="graph-frame">
          <ForceGraph2D
            graphData={graphData}
            width={graphWidth}
            height={520}
            nodeAutoColorBy="group"
            nodeLabel={(node: any) => `${node.name} (${node.group})`}
            linkColor={() => 'rgba(15, 27, 32, 0.2)'}
            nodeRelSize={4}
          />
        </div>
      </div>

      <div className="graph-json">
        <h3>Graph JSON Preview</h3>
        <pre>{JSON.stringify(graphData, null, 2).slice(0, 2000)}...</pre>
      </div>
    </div>
  );
};

export default KnowledgeGraphScreenV2;
