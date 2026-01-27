import { NormalizedSeoEntry, SeoNormalizerReport } from './seoNormalizerV2';

export interface SeoAuditSummaryV2 {
  total: number;
  missingTitle: number;
  missingDescription: number;
  missingCanonical: number;
  missingOpenGraphImage: number;
  missingTwitterTitle: number;
  missingFocusKeyword: number;
  noIndexCount: number;
  lowReadability: number;
  schemaMissing: number;
}

export interface SeoAuditIssueLists {
  missingTitle: NormalizedSeoEntry[];
  missingDescription: NormalizedSeoEntry[];
  missingCanonical: NormalizedSeoEntry[];
  missingOpenGraphImage: NormalizedSeoEntry[];
  missingTwitterTitle: NormalizedSeoEntry[];
  missingFocusKeyword: NormalizedSeoEntry[];
  noIndex: NormalizedSeoEntry[];
  lowReadability: NormalizedSeoEntry[];
  schemaMissing: NormalizedSeoEntry[];
}

export interface SeoAuditReportV2 {
  summary: SeoAuditSummaryV2;
  lists: SeoAuditIssueLists;
}

export const buildSeoAuditReportV2 = (report: SeoNormalizerReport): SeoAuditReportV2 => {
  const entries = report.entries;
  const missingTitle = entries.filter((entry) => !entry.seo.metaPresence.title);
  const missingDescription = entries.filter((entry) => !entry.seo.metaPresence.description);
  const missingCanonical = entries.filter((entry) => !entry.seo.metaPresence.canonical);
  const missingOpenGraphImage = entries.filter((entry) => !entry.seo.metaPresence.openGraphImage);
  const missingTwitterTitle = entries.filter((entry) => !entry.seo.metaPresence.twitterTitle);
  const missingFocusKeyword = entries.filter((entry) => !entry.seo.metaPresence.focusKeyword);
  const noIndex = entries.filter((entry) => !entry.seo.robots.index);
  const lowReadability = entries.filter((entry) => (entry.seo.readabilityScore ?? 100) < 60);
  const schemaMissing = entries.filter((entry) => entry.seo.schemaCount === 0);

  return {
    summary: {
      total: entries.length,
      missingTitle: missingTitle.length,
      missingDescription: missingDescription.length,
      missingCanonical: missingCanonical.length,
      missingOpenGraphImage: missingOpenGraphImage.length,
      missingTwitterTitle: missingTwitterTitle.length,
      missingFocusKeyword: missingFocusKeyword.length,
      noIndexCount: noIndex.length,
      lowReadability: lowReadability.length,
      schemaMissing: schemaMissing.length,
    },
    lists: {
      missingTitle,
      missingDescription,
      missingCanonical,
      missingOpenGraphImage,
      missingTwitterTitle,
      missingFocusKeyword,
      noIndex,
      lowReadability,
      schemaMissing,
    },
  };
};
