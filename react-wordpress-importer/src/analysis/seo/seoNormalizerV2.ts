import { Post } from '../../core/domain/types/Post';
import { PostMeta } from '../../core/domain/types/PostMeta';
import { extractJsonLdSchemas } from './schemaExtractor';

export type SeoSource = 'yoast' | 'aioseo' | 'fallback';

export interface NormalizedSeo {
  title: string;
  description: string;
  focusKeywords: string[];
  canonical?: string;
  robots: {
    index: boolean;
    follow: boolean;
  };
  openGraph: {
    title?: string;
    image?: string;
  };
  twitter: {
    title?: string;
    image?: string;
  };
  sitemap?: {
    priority?: string;
    changefreq?: string;
  };
  readabilityScore?: number;
  schemaCount: number;
  metaPresence: {
    title: boolean;
    description: boolean;
    canonical: boolean;
    focusKeyword: boolean;
    openGraphImage: boolean;
    twitterTitle: boolean;
  };
  source: SeoSource;
}

export interface NormalizedSeoEntry {
  postId: number;
  title: string;
  slug: string;
  seo: NormalizedSeo;
}

export interface SeoPluginUsage {
  yoast: boolean;
  aioseo: boolean;
  aioseoLegacy: boolean;
}

export interface SeoNormalizerReport {
  entries: NormalizedSeoEntry[];
  pluginUsage: SeoPluginUsage;
  warnings: string[];
}

const toBool = (value?: string) => {
  if (!value) return false;
  const normalized = value.toLowerCase().trim();
  return normalized === '1' || normalized === 'true' || normalized === 'yes';
};

const cleanVariableText = (value: string) => {
  return value.replace(/%%[^%]+%%/g, '').trim();
};

const extractDescriptionFallback = (post: Post) => {
  if (post.Excerpt && post.Excerpt.trim()) return post.Excerpt.trim();
  const html = post.ContentEncoded || post.CleanedHtmlSource || '';
  const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  return text.slice(0, 160);
};

const metaValue = (meta: Record<string, string>, keys: string[]) => {
  for (const key of keys) {
    const value = meta[key];
    if (value && value.trim()) return value.trim();
  }
  return '';
};

const parseKeywords = (value: string) =>
  value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

const buildMetaIndex = (postMeta: PostMeta[]) => {
  const metaByPost = new Map<number, Record<string, string>>();
  postMeta.forEach((meta) => {
    const existing = metaByPost.get(meta.PostId) ?? {};
    existing[meta.MetaKey] = meta.MetaValue;
    metaByPost.set(meta.PostId, existing);
  });
  return metaByPost;
};

export const detectSeoPlugins = (postMeta: PostMeta[]): SeoPluginUsage => {
  const keys = new Set(postMeta.map((meta) => meta.MetaKey));
  const yoast = Array.from(keys).some((key) => key.startsWith('_yoast_wpseo_'));
  const aioseo = Array.from(keys).some((key) => key.startsWith('_aioseo_') || key.startsWith('_aioseop_'));
  const aioseoLegacy = Array.from(keys).some((key) => key.startsWith('_aioseop_'));
  return { yoast, aioseo, aioseoLegacy };
};

export const normalizeSeoForPosts = (posts: Post[], postMeta: PostMeta[]): SeoNormalizerReport => {
  const metaIndex = buildMetaIndex(postMeta);
  const pluginUsage = detectSeoPlugins(postMeta);
  const entries: NormalizedSeoEntry[] = [];

  let aioseoCoverage = 0;

  posts
    .filter((post) => post.PostType === 'post')
    .forEach((post) => {
      const meta = metaIndex.get(post.PostId) ?? {};
      const yoastTitle = metaValue(meta, ['_yoast_wpseo_title']);
      const yoastDesc = metaValue(meta, ['_yoast_wpseo_metadesc']);
      const yoastFocus = metaValue(meta, ['_yoast_wpseo_focuskw']);
      const yoastCanonical = metaValue(meta, ['_yoast_wpseo_canonical']);
      const yoastNoIndex = metaValue(meta, ['_yoast_wpseo_meta-robots-noindex']);
      const yoastNoFollow = metaValue(meta, ['_yoast_wpseo_meta-robots-nofollow']);
      const yoastOgTitle = metaValue(meta, ['_yoast_wpseo_opengraph-title']);
      const yoastOgImage = metaValue(meta, ['_yoast_wpseo_opengraph-image']);
      const yoastTwitterTitle = metaValue(meta, ['_yoast_wpseo_twitter-title']);
      const yoastTwitterImage = metaValue(meta, ['_yoast_wpseo_twitter-image']);
      const yoastReadability = metaValue(meta, ['_yoast_wpseo_content_score']);
      const yoastSitemapPriority = metaValue(meta, ['_yoast_wpseo_sitemap-prio']);
      const yoastSitemapChange = metaValue(meta, ['_yoast_wpseo_sitemap-changefreq']);

      const aioseoTitle = metaValue(meta, ['_aioseop_title']);
      const aioseoDesc = metaValue(meta, ['_aioseop_description']);
      const aioseoKeywords = metaValue(meta, ['_aioseop_keywords']);
      const aioseoCanonical = metaValue(meta, ['_aioseop_custom_link']);
      const aioseoNoIndex = metaValue(meta, ['_aioseop_noindex']);
      const aioseoOgTitle = metaValue(meta, ['_aioseop_opengraph_settings_title']);
      const aioseoOgImage = metaValue(meta, ['_aioseop_opengraph_settings_image']);
      const aioseoTwitterTitle = metaValue(meta, ['_aioseop_twitter_settings_title']);
      const aioseoTwitterImage = metaValue(meta, ['_aioseop_twitter_settings_image']);

      const hasAioseoMeta = Boolean(aioseoTitle || aioseoDesc || aioseoKeywords || aioseoCanonical || aioseoNoIndex);
      if (hasAioseoMeta) aioseoCoverage += 1;

      let source: SeoSource = 'fallback';
      if (yoastTitle || yoastDesc || yoastFocus) source = 'yoast';
      else if (hasAioseoMeta) source = 'aioseo';

      const title = cleanVariableText(yoastTitle || aioseoTitle || post.Title || 'Untitled');
      const description = cleanVariableText(yoastDesc || aioseoDesc || extractDescriptionFallback(post));
      const focusKeywords = parseKeywords(yoastFocus || aioseoKeywords);
      const canonical = yoastCanonical || aioseoCanonical || undefined;
      const robotsNoIndex = toBool(yoastNoIndex) || toBool(aioseoNoIndex);
      const robotsNoFollow = toBool(yoastNoFollow);

      const schemaMatches = extractJsonLdSchemas(post.ContentEncoded || post.CleanedHtmlSource || '');

      entries.push({
        postId: post.PostId,
        title: post.Title || 'Untitled',
        slug: post.PostName || '',
        seo: {
          title,
          description,
          focusKeywords,
          canonical,
          robots: {
            index: !robotsNoIndex,
            follow: !robotsNoFollow,
          },
          openGraph: {
            title: yoastOgTitle || aioseoOgTitle || undefined,
            image: yoastOgImage || aioseoOgImage || undefined,
          },
          twitter: {
            title: yoastTwitterTitle || aioseoTwitterTitle || undefined,
            image: yoastTwitterImage || aioseoTwitterImage || undefined,
          },
          sitemap: {
            priority: yoastSitemapPriority || undefined,
            changefreq: yoastSitemapChange || undefined,
          },
          readabilityScore: yoastReadability ? Number(yoastReadability) : undefined,
          schemaCount: schemaMatches.length,
          metaPresence: {
            title: Boolean(yoastTitle || aioseoTitle),
            description: Boolean(yoastDesc || aioseoDesc),
            canonical: Boolean(yoastCanonical || aioseoCanonical),
            focusKeyword: Boolean(yoastFocus || aioseoKeywords),
            openGraphImage: Boolean(yoastOgImage || aioseoOgImage),
            twitterTitle: Boolean(yoastTwitterTitle || aioseoTwitterTitle),
          },
          source,
        },
      });
    });

  const warnings: string[] = [];
  if (pluginUsage.aioseo && pluginUsage.aioseoLegacy) {
    const coverage = entries.length ? aioseoCoverage / entries.length : 0;
    if (coverage < 0.2) {
      warnings.push('AIOSEO detected but meta coverage is low. Use the AIOSEO export tool or hydrate meta before export.');
    }
  }

  if (pluginUsage.aioseo && !pluginUsage.aioseoLegacy) {
    warnings.push('AIOSEO plugin detected. XML export may omit AIOSEO v4 metadata.');
  }

  return { entries, pluginUsage, warnings };
};
