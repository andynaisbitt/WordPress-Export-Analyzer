import { htmlToMarkdown } from './markdownCleanerV2';

export type GutenbergBlock =
  | { kind: 'block'; name: string; attrs: Record<string, unknown>; raw: string; html: string }
  | { kind: 'html'; markdown: string; html: string };

const parseAttrs = (raw: string) => {
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
};

const blockStartRegex = /<!--\s*wp:([a-zA-Z0-9-\/]+)(\s+({[\s\S]*?}))?\s*-->/g;
const blockEndRegex = /<!--\s*\/wp:([a-zA-Z0-9-\/]+)\s*-->/g;

export const parseGutenbergBlocks = (htmlContent: string): GutenbergBlock[] => {
  const blocks: GutenbergBlock[] = [];
  let cursor = 0;

  while (cursor < htmlContent.length) {
    blockStartRegex.lastIndex = cursor;
    const startMatch = blockStartRegex.exec(htmlContent);

    if (!startMatch) {
      const remaining = htmlContent.slice(cursor).trim();
      if (remaining) {
        blocks.push({
          kind: 'html',
          html: remaining,
          markdown: htmlToMarkdown(remaining),
        });
      }
      break;
    }

    const startIndex = startMatch.index;
    if (startIndex > cursor) {
      const htmlChunk = htmlContent.slice(cursor, startIndex).trim();
      if (htmlChunk) {
        blocks.push({
          kind: 'html',
          html: htmlChunk,
          markdown: htmlToMarkdown(htmlChunk),
        });
      }
    }

    const blockName = startMatch[1];
    const attrsRaw = startMatch[3];
    const attrs = parseAttrs(attrsRaw || '');
    const blockOpenEnd = blockStartRegex.lastIndex;

    blockEndRegex.lastIndex = blockOpenEnd;
    const endMatch = blockEndRegex.exec(htmlContent);
    let blockHtml = '';
    let nextCursor = blockOpenEnd;

    if (endMatch) {
      blockHtml = htmlContent.slice(blockOpenEnd, endMatch.index);
      nextCursor = blockEndRegex.lastIndex;
    }

    blocks.push({
      kind: 'block',
      name: blockName,
      attrs,
      raw: startMatch[0],
      html: blockHtml.trim(),
    });

    cursor = nextCursor;
  }

  return blocks;
};
