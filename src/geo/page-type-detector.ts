/**
 * Page Type Detector
 *
 * Auto-detects page type from URL patterns, meta tags, and content heuristics.
 * Zero dependencies, regex-based.
 */

import type { PageType, PageTypeResult, GeoPageRule } from "../types/geo.types";

/**
 * URL pattern rules for page type detection
 */
const URL_PATTERNS: Array<{ pattern: RegExp; pageType: PageType }> = [
  { pattern: /\/products?\//i, pageType: "product" },
  { pattern: /\/shop\//i, pageType: "product" },
  { pattern: /\/item\//i, pageType: "product" },
  { pattern: /\/pricing\/?$/i, pageType: "pricing" },
  { pattern: /\/plans?\/?$/i, pageType: "pricing" },
  { pattern: /\/faq\/?$/i, pageType: "faq" },
  { pattern: /\/frequently-asked/i, pageType: "faq" },
  { pattern: /\/docs?\//i, pageType: "docs" },
  { pattern: /\/documentation\//i, pageType: "docs" },
  { pattern: /\/api\//i, pageType: "docs" },
  { pattern: /\/guide\//i, pageType: "docs" },
  { pattern: /\/blog\//i, pageType: "article" },
  { pattern: /\/articles?\//i, pageType: "article" },
  { pattern: /\/posts?\//i, pageType: "article" },
  { pattern: /\/news\//i, pageType: "article" },
  { pattern: /\/how-to/i, pageType: "how-to" },
  { pattern: /\/tutorial/i, pageType: "how-to" },
  { pattern: /\/compar/i, pageType: "comparison" },
  { pattern: /\/vs\//i, pageType: "comparison" },
  { pattern: /-vs-/i, pageType: "comparison" },
];

/**
 * Detect page type from URL path
 */
function detectFromUrl(pathname: string): PageTypeResult | null {
  for (const { pattern, pageType } of URL_PATTERNS) {
    if (pattern.test(pathname)) {
      return { pageType, confidence: "medium", source: "url-pattern" };
    }
  }
  return null;
}

/**
 * Detect page type from HTML meta tags
 */
function detectFromMeta(html: string): PageTypeResult | null {
  // Check og:type
  const ogTypeMatch = html.match(/<meta[^>]*property=["']og:type["'][^>]*content=["']([^"']+)["']/i)
    || html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:type["']/i);

  if (ogTypeMatch) {
    const ogType = ogTypeMatch[1].toLowerCase();
    if (ogType === "article" || ogType === "blog") {
      return { pageType: "article", confidence: "high", source: "meta-tag" };
    }
    if (ogType === "product" || ogType === "product.item") {
      return { pageType: "product", confidence: "high", source: "meta-tag" };
    }
  }

  // Check article:published_time (strong signal for article)
  if (/<meta[^>]*property=["']article:published_time["']/i.test(html)) {
    return { pageType: "article", confidence: "high", source: "meta-tag" };
  }

  return null;
}

/**
 * Detect page type from content heuristics
 */
function detectFromContent(html: string): PageTypeResult | null {
  // FAQ detection: multiple H2/H3 that look like questions
  const questionHeadings = html.match(/<h[23][^>]*>[^<]*\?[^<]*<\/h[23]>/gi);
  if (questionHeadings && questionHeadings.length >= 3) {
    return { pageType: "faq", confidence: "medium", source: "content-heuristic" };
  }

  // Pricing detection: price patterns
  const priceMatches = html.match(/\$[\d,]+(?:\.\d{2})?/g)
    || html.match(/(?:USD|EUR|GBP)\s*[\d,]+/gi);
  if (priceMatches && priceMatches.length >= 2) {
    return { pageType: "pricing", confidence: "medium", source: "content-heuristic" };
  }

  // How-to detection: ordered lists with step-like content
  const orderedLists = html.match(/<ol[^>]*>[\s\S]*?<\/ol>/gi);
  if (orderedLists && orderedLists.length >= 1) {
    const stepKeywords = /step\s+\d|how to|instructions/i;
    if (stepKeywords.test(html)) {
      return { pageType: "how-to", confidence: "low", source: "content-heuristic" };
    }
  }

  // Code blocks suggest documentation
  const codeBlocks = html.match(/<pre[^>]*>[\s\S]*?<\/pre>/gi)
    || html.match(/<code[^>]*>[\s\S]*?<\/code>/gi);
  if (codeBlocks && codeBlocks.length >= 3) {
    return { pageType: "docs", confidence: "low", source: "content-heuristic" };
  }

  return null;
}

/**
 * Convert a glob pattern to a regex for URL matching.
 * - `*` matches any single path segment
 * - `**` matches any number of path segments
 * - Exact paths match exactly
 */
export function globToRegex(pattern: string): RegExp {
  const regexStr = pattern
    // Escape special regex chars except * and /
    .replace(/[.+^${}()|[\]\\]/g, "\\$&")
    // Replace ** with a placeholder
    .replace(/\*\*/g, "{{GLOBSTAR}}")
    // Replace * with single segment match
    .replace(/\*/g, "[^/]+")
    // Replace placeholder with multi-segment match
    .replace(/\{\{GLOBSTAR\}\}/g, ".*");

  // Ensure it matches the full path
  return new RegExp(`^${regexStr}$`);
}

/**
 * Find matching GEO rule for a URL path
 */
export function findMatchingRule(
  pathname: string,
  rules: GeoPageRule[],
): GeoPageRule | null {
  for (const rule of rules) {
    const regex = globToRegex(rule.urlPattern);
    if (regex.test(pathname)) {
      return rule;
    }
  }
  return null;
}

/**
 * Detect page type using all available signals.
 * Priority: GEO rule > URL pattern > meta tags > content heuristics > generic
 */
export function detectPageType(
  pathname: string,
  html: string,
  geoRules: GeoPageRule[],
): PageTypeResult {
  // 1. Check GEO rules first (highest priority — user-configured)
  const matchingRule = findMatchingRule(pathname, geoRules);
  if (matchingRule?.pageType) {
    return {
      pageType: matchingRule.pageType,
      confidence: "high",
      source: "geo-rule",
    };
  }

  // 2. URL pattern matching
  const urlResult = detectFromUrl(pathname);
  if (urlResult) return urlResult;

  // 3. Meta tag analysis
  const metaResult = detectFromMeta(html);
  if (metaResult) return metaResult;

  // 4. Content heuristic analysis
  const contentResult = detectFromContent(html);
  if (contentResult) return contentResult;

  // 5. Default: generic
  return { pageType: "generic", confidence: "low", source: "default" };
}
