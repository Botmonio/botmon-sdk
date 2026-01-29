/**
 * Heading Enricher
 *
 * Adds semantic data attributes to HTML headings for AI comprehension.
 * Only modifies headings — no structural changes.
 */

import type { PageType } from "../types/geo.types";

/**
 * Enrich headings with semantic data attributes.
 * Adds data-botmon-section and data-botmon-level attributes.
 */
export function enrichHeadings(html: string, pageType: PageType): string {
  let sectionIndex = 0;

  return html.replace(
    /<h([1-6])([^>]*)>([\s\S]*?)<\/h\1>/gi,
    (_match, level: string, attrs: string, content: string) => {
      sectionIndex++;

      // Don't add duplicate attributes
      if (attrs.includes("data-botmon-section")) {
        return _match;
      }

      const enrichedAttrs = `${attrs} data-botmon-section="${sectionIndex}" data-botmon-level="${level}" data-botmon-page-type="${pageType}"`;
      return `<h${level}${enrichedAttrs}>${content}</h${level}>`;
    },
  );
}
