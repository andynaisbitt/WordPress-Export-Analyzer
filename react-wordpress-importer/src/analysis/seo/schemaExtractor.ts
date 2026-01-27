export interface SchemaExtraction {
  raw: string;
  parsed?: unknown;
}

export const extractJsonLdSchemas = (html: string): SchemaExtraction[] => {
  if (!html) return [];
  const results: SchemaExtraction[] = [];
  const regex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(html)) !== null) {
    const raw = match[1].trim();
    if (!raw) continue;
    try {
      results.push({ raw, parsed: JSON.parse(raw) });
    } catch {
      results.push({ raw });
    }
  }
  return results;
};
