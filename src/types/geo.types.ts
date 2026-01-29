/**
 * GEO (Generative Engine Optimization) Types
 *
 * Types for AI bot detection, page type classification,
 * schema generation, and content optimization.
 */

/**
 * Supported page types for auto-detection and schema generation
 */
export type PageType =
  | "product"
  | "article"
  | "docs"
  | "faq"
  | "how-to"
  | "pricing"
  | "comparison"
  | "generic";

/**
 * Schema.org types generated for each page type
 */
export type SchemaType =
  | "Product"
  | "Article"
  | "TechArticle"
  | "FAQPage"
  | "HowTo"
  | "WebPage"
  | "Offer";

/**
 * Per-route GEO rule configuration
 */
export interface GeoPageRule {
  /** Glob pattern for URL matching (e.g. "/products/*", "/docs/**", "/pricing") */
  urlPattern: string;
  /** Force page type (skip auto-detection) */
  pageType?: PageType;
  /** Force specific schema types */
  schemaTypes?: SchemaType[];
  /** Custom summary text */
  summary?: string;
  /** Custom JSON-LD data to merge */
  customJsonLd?: Record<string, unknown>;
  /** Disable GEO for matching URLs */
  disabled?: boolean;
}

/**
 * GEO rule configuration (SDK defaults + dashboard overrides)
 */
export interface GeoRuleConfig {
  enabled: boolean;
  /** Filter which page types to optimize */
  pageTypes?: PageType[];
  /** Inject summary meta tag / frontmatter block */
  injectSummary?: boolean;
  /** Inject JSON-LD structured data */
  injectJsonLd?: boolean;
  /** Add semantic data attributes to headings */
  enrichHeadings?: boolean;
  /** Per-URL route rules (SDK code defaults) */
  rules?: GeoPageRule[];
}

/**
 * Page type detection result
 */
export interface PageTypeResult {
  pageType: PageType;
  confidence: "high" | "medium" | "low";
  /** Which signal triggered the detection */
  source: "url-pattern" | "meta-tag" | "content-heuristic" | "geo-rule" | "default";
}

/**
 * AI bot detection result
 */
export interface AiBotDetectionResult {
  isAiBot: boolean;
  botName?: string;
  botCategory?: string;
  /** Tags for additional classification */
  botTags?: string[];
}

/**
 * Generated structured data for a page
 */
export interface GeneratedSchema {
  "@context": "https://schema.org";
  "@type": SchemaType | SchemaType[];
  [key: string]: unknown;
}

/**
 * Summary extraction result
 */
export interface ExtractedSummary {
  text: string;
  source: "meta-description" | "og-description" | "first-paragraph" | "custom";
}

/**
 * GEO optimization result returned by the engine
 */
export interface GeoOptimizationResult {
  modified: boolean;
  response: Response;
  pageType?: PageType;
  schemasInjected?: SchemaType[];
  summaryInjected?: boolean;
  headingsEnriched?: boolean;
}
