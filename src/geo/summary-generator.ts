/**
 * Summary Generator
 *
 * Extracts a TL;DR summary from HTML content using available signals:
 * 1. Custom summary from GEO rule (highest priority)
 * 2. Meta description
 * 3. og:description
 * 4. First meaningful paragraph
 */

import type { ExtractedSummary, GeoPageRule } from "../types/geo.types";
import {
  extractMetaDescription,
  extractOgDescription,
  extractFirstParagraph,
} from "./html-utils";

/**
 * Extract a summary from HTML content
 */
export function extractSummary(
  html: string,
  matchingRule: GeoPageRule | null,
): ExtractedSummary | null {
  // 1. Custom summary from GEO rule
  if (matchingRule?.summary) {
    return { text: matchingRule.summary, source: "custom" };
  }

  // 2. Meta description
  const metaDesc = extractMetaDescription(html);
  if (metaDesc && metaDesc.length >= 30) {
    return { text: metaDesc, source: "meta-description" };
  }

  // 3. og:description
  const ogDesc = extractOgDescription(html);
  if (ogDesc && ogDesc.length >= 30) {
    return { text: ogDesc, source: "og-description" };
  }

  // 4. First paragraph
  const firstParagraph = extractFirstParagraph(html);
  if (firstParagraph) {
    return { text: firstParagraph, source: "first-paragraph" };
  }

  return null;
}
