// importWorker.ts
import { XmlParser } from '../data/services/XmlParser';
import { DataMapper } from '../data/services/DataMapper';

const postSafe = (message: any) => {
  try {
    self.postMessage(message);
  } catch {
    // no-op
  }
};

postSafe({ type: 'workerReady' });

self.onmessage = async (event) => {
  const { type, payload } = event.data;

  switch (type) {
    case 'startImport':
      postSafe({ type: 'workerAck' });
      postSafe({ type: 'progress', payload: { step: 'parse', percentage: 5 } });
      try {
        const xmlParser = new XmlParser();
        postSafe({ type: 'progress', payload: { step: 'parse', percentage: 10 } });
        const parsedXml = xmlParser.parse(payload.xmlString);
        postSafe({ type: 'progress', payload: { step: 'parse', percentage: 25 } });

        const mapper = new DataMapper();
        postSafe({ type: 'progress', payload: { step: 'parse', percentage: 40 } });
        const mappedData = mapper.map(parsedXml);
        postSafe({ type: 'mappedData', payload: mappedData });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        const stack = error instanceof Error ? error.stack : undefined;
        postSafe({ type: 'importFailed', payload: { message, stack } });
      }
      break;
    default:
      console.warn('Unknown message type:', type);
  }
};
