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

export interface SeoIssueRow {
  postId: number;
  title: string;
  slug: string;
  source: string;
  score: number;
  severity: 'high' | 'medium' | 'low';
  issues: string[];
}

export const buildSeoIssueRows = (report: SeoNormalizerReport): SeoIssueRow[] => {
  return report.entries.map((entry) => {
    const issues: string[] = [];
    let score = 100;

    if (!entry.seo.metaPresence.title) {
      issues.push('Missing SEO title');
      score -= 20;
    }
    if (!entry.seo.metaPresence.description) {
      issues.push('Missing meta description');
      score -= 20;
    }
    if (!entry.seo.metaPresence.canonical) {
      issues.push('Missing canonical');
      score -= 8;
    }
    if (!entry.seo.metaPresence.openGraphImage) {
      issues.push('Missing OpenGraph image');
      score -= 8;
    }
    if (!entry.seo.metaPresence.twitterTitle) {
      issues.push('Missing Twitter title');
      score -= 4;
    }
    if (!entry.seo.metaPresence.focusKeyword) {
      issues.push('Missing focus keyword');
      score -= 4;
    }
    if (!entry.seo.robots.index) {
      issues.push('NoIndex enabled');
      score -= 12;
    }
    if ((entry.seo.readabilityScore ?? 100) < 60) {
      issues.push('Low readability score');
      score -= 6;
    }
    if (entry.seo.schemaCount === 0) {
      issues.push('No schema detected');
      score -= 6;
    }

    const clamped = Math.max(0, Math.min(100, score));
    const severity = clamped < 55 ? 'high' : clamped < 80 ? 'medium' : 'low';

    return {
      postId: entry.postId,
      title: entry.title,
      slug: entry.slug,
      source: entry.seo.source,
      score: clamped,
      severity,
      issues,
    };
  });
};

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
