import { PostMeta } from '../../core/domain/types/PostMeta';

export interface DetectedPlugin {
  id: string;
  name: string;
  description: string;
  evidenceCount: number;
  sampleKeys: string[];
}

export interface PluginDetectionReport {
  plugins: DetectedPlugin[];
  totalKeys: number;
}

const pluginDefinitions = [
  {
    id: 'yoast',
    name: 'Yoast SEO',
    description: 'SEO titles, descriptions, schema, social metadata.',
    match: (key: string) => key.startsWith('_yoast_wpseo_'),
  },
  {
    id: 'aioseo',
    name: 'All in One SEO (AIOSEO)',
    description: 'SEO meta and social settings (legacy keys).',
    match: (key: string) => key.startsWith('_aioseo_') || key.startsWith('_aioseop_'),
  },
  {
    id: 'rankmath',
    name: 'Rank Math',
    description: 'SEO titles, schema, and social metadata.',
    match: (key: string) => key.startsWith('_rank_math_'),
  },
  {
    id: 'seopress',
    name: 'SEOPress',
    description: 'SEO meta, social, and schema settings.',
    match: (key: string) => key.startsWith('_seopress_'),
  },
  {
    id: 'acf',
    name: 'Advanced Custom Fields',
    description: 'Custom field metadata for flexible content.',
    match: (key: string) => key.startsWith('field_') || key.startsWith('_acf_') || key.startsWith('_field_'),
  },
  {
    id: 'elementor',
    name: 'Elementor',
    description: 'Page builder layouts and settings.',
    match: (key: string) => key.startsWith('_elementor_'),
  },
  {
    id: 'wpbakery',
    name: 'WPBakery',
    description: 'VC page builder metadata.',
    match: (key: string) => key.startsWith('_wpb_') || key.startsWith('vc_'),
  },
  {
    id: 'divi',
    name: 'Divi',
    description: 'Divi builder post settings.',
    match: (key: string) => key.startsWith('_et_'),
  },
  {
    id: 'woocommerce',
    name: 'WooCommerce',
    description: 'Product metadata and catalog settings.',
    match: (key: string) => key.startsWith('_product_') || key.startsWith('_wc_') || key.startsWith('_woocommerce_'),
  },
  {
    id: 'wpforms',
    name: 'WPForms',
    description: 'Form metadata and entries.',
    match: (key: string) => key.startsWith('_wpforms_'),
  },
  {
    id: 'contactform7',
    name: 'Contact Form 7',
    description: 'Contact Form 7 metadata.',
    match: (key: string) => key.startsWith('_wpcf7_'),
  },
  {
    id: 'yoast-schema',
    name: 'Yoast Schema',
    description: 'Yoast schema graph metadata.',
    match: (key: string) => key.startsWith('_yoast_wpseo_schema_'),
  },
];

export const detectPluginsFromPostMeta = (postMeta: PostMeta[]): PluginDetectionReport => {
  const keys = postMeta.map((meta) => meta.MetaKey);
  const plugins = pluginDefinitions
    .map((plugin) => {
      const matches = keys.filter((key) => plugin.match(key));
      return {
        id: plugin.id,
        name: plugin.name,
        description: plugin.description,
        evidenceCount: matches.length,
        sampleKeys: Array.from(new Set(matches)).slice(0, 6),
      };
    })
    .filter((plugin) => plugin.evidenceCount > 0)
    .sort((a, b) => b.evidenceCount - a.evidenceCount);

  return {
    plugins,
    totalKeys: keys.length,
  };
};
