import { Tag } from '../../core/domain/types/Tag';

export interface ClusterSuggestion {
  master: Tag;
  candidates: Tag[];
  similarity: number;
}

const normalize = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
    .trim();

export const levenshteinDistance = (a: string, b: string) => {
  const matrix: number[][] = [];
  const aLen = a.length;
  const bLen = b.length;

  for (let i = 0; i <= bLen; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= aLen; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= bLen; i++) {
    for (let j = 1; j <= aLen; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[bLen][aLen];
};

export const similarityScore = (a: string, b: string) => {
  if (!a && !b) return 1;
  if (!a || !b) return 0;
  const distance = levenshteinDistance(a, b);
  return 1 - distance / Math.max(a.length, b.length);
};

export const findSimilarTags = (tags: Tag[], threshold = 0.8): ClusterSuggestion[] => {
  const clusters: ClusterSuggestion[] = [];
  const used = new Set<string>();

  for (let i = 0; i < tags.length; i++) {
    const base = tags[i];
    if (used.has(base.Nicename || base.Name)) continue;
    const baseNorm = normalize(base.Nicename || base.Name);
    if (!baseNorm) continue;

    const candidates: Tag[] = [];
    let bestSimilarity = 0;

    for (let j = i + 1; j < tags.length; j++) {
      const candidate = tags[j];
      if (used.has(candidate.Nicename || candidate.Name)) continue;
      const candidateNorm = normalize(candidate.Nicename || candidate.Name);
      if (!candidateNorm) continue;
      const score = similarityScore(baseNorm, candidateNorm);
      if (score >= threshold) {
        candidates.push(candidate);
        bestSimilarity = Math.max(bestSimilarity, score);
      }
    }

    if (candidates.length) {
      const clusterTags = [base, ...candidates];
      const master = clusterTags.reduce((best, tag) =>
        (tag.PostCount || 0) > (best.PostCount || 0) ? tag : best
      );
      clusters.push({
        master,
        candidates: clusterTags.filter((tag) => tag !== master),
        similarity: bestSimilarity,
      });
      clusterTags.forEach((tag) => used.add(tag.Nicename || tag.Name));
    }
  }

  return clusters;
};
