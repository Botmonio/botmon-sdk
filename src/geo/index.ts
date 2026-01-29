/**
 * GEO (Generative Engine Optimization) Engine
 *
 * Entry point for AI bot content optimization.
 * Detects page type, generates structured data, extracts summaries,
 * and injects optimizations into the response.
 *
 * Only processes AI bot requests. Humans get unmodified responses.
 */

import type { ResponseContext } from "../types/middleware.types";
import type { ResolvedConfig } from "../types/managed-rules.types";
import type { GeoOptimizationResult, SchemaType } from "../types/geo.types";
import { detectPageType, findMatchingRule } from "./page-type-detector";
import { generateSchema } from "./schema-generator";
import { extractSummary } from "./summary-generator";
import { enrichHeadings } from "./heading-enricher";

type GeoConfig = ResolvedConfig["geo"];

/**
 * Apply GEO optimization to a response.
 * Only called for AI bot requests with HTML, text, or markdown content.
 */
export async function applyGeoOptimization(
  response: Response,
  context: ResponseContext,
  config: GeoConfig,
): Promise<GeoOptimizationResult> {
  const contentType = response.headers.get("Content-Type") || "";

  // Determine content type strategy
  if (contentType.includes("text/html")) {
    return applyHtmlGeo(response, context, config);
  }

  if (contentType.includes("text/plain") || contentType.includes("text/markdown")) {
    return applyTextGeo(response, context, config);
  }

  // JSON and other types: no modification
  return { modified: false, response };
}

/**
 * Full GEO pipeline for HTML responses:
 * 1. Detect page type
 * 2. Check if URL matches any GEO rule (and isn't disabled)
 * 3. Generate JSON-LD schema
 * 4. Extract/inject summary
 * 5. Enrich headings
 */
async function applyHtmlGeo(
  response: Response,
  context: ResponseContext,
  config: GeoConfig,
): Promise<GeoOptimizationResult> {
  const html = await response.text();
  const pathname = context.url.pathname;

  // Check if this URL is disabled by a matching rule
  const matchingRule = findMatchingRule(pathname, config.rules);
  if (matchingRule?.disabled) {
    return {
      modified: false,
      response: new Response(html, {
        status: response.status,
        headers: response.headers,
      }),
    };
  }

  // Detect page type
  const pageTypeResult = detectPageType(pathname, html, config.rules);
  const pageType = pageTypeResult.pageType;

  let modifiedHtml = html;
  let modified = false;
  const schemasInjected: SchemaType[] = [];
  let summaryInjected = false;
  let headingsEnriched = false;

  // 1. Inject JSON-LD
  if (config.injectJsonLd) {
    const schema = generateSchema(pageType, html, context.url, matchingRule || null);
    if (schema) {
      const jsonLdScript = `<script type="application/ld+json">${JSON.stringify(schema)}</script>`;

      // Inject before </head>
      const headCloseIndex = modifiedHtml.lastIndexOf("</head>");
      if (headCloseIndex !== -1) {
        modifiedHtml = modifiedHtml.slice(0, headCloseIndex)
          + jsonLdScript + "\n"
          + modifiedHtml.slice(headCloseIndex);
        modified = true;
        schemasInjected.push(schema["@type"] as SchemaType);
      }
    }
  }

  // 2. Inject summary meta tag
  if (config.injectSummary) {
    const summary = extractSummary(html, matchingRule || null);
    if (summary) {
      const summaryMeta = `<meta name="botmon:summary" content="${escapeAttr(summary.text)}">`;

      // Inject before </head>
      const headCloseIndex = modifiedHtml.lastIndexOf("</head>");
      if (headCloseIndex !== -1) {
        modifiedHtml = modifiedHtml.slice(0, headCloseIndex)
          + summaryMeta + "\n"
          + modifiedHtml.slice(headCloseIndex);
        modified = true;
        summaryInjected = true;
      }
    }
  }

  // 3. Enrich headings
  if (config.enrichHeadings) {
    const enriched = enrichHeadings(modifiedHtml, pageType);
    if (enriched !== modifiedHtml) {
      modifiedHtml = enriched;
      modified = true;
      headingsEnriched = true;
    }
  }

  // Build new response with GEO headers
  const headers = new Headers(response.headers);
  if (modified) {
    headers.set("X-BotMon-GEO", "applied");
    headers.set("X-BotMon-PageType", pageType);
  }

  return {
    modified,
    response: new Response(modifiedHtml, {
      status: response.status,
      headers,
    }),
    pageType,
    schemasInjected,
    summaryInjected,
    headingsEnriched,
  };
}

/**
 * GEO pipeline for text/plain and text/markdown responses:
 * Prepends a structured frontmatter block with summary and schema data.
 */
async function applyTextGeo(
  response: Response,
  context: ResponseContext,
  config: GeoConfig,
): Promise<GeoOptimizationResult> {
  const text = await response.text();
  const pathname = context.url.pathname;

  // Check if this URL is disabled
  const matchingRule = findMatchingRule(pathname, config.rules);
  if (matchingRule?.disabled) {
    return {
      modified: false,
      response: new Response(text, {
        status: response.status,
        headers: response.headers,
      }),
    };
  }

  // Detect page type from URL pattern and rules
  const pageTypeResult = detectPageType(pathname, "", config.rules);
  const pageType = pageTypeResult.pageType;

  // Build frontmatter block
  const frontmatterLines: string[] = [];

  if (config.injectSummary) {
    const summary = matchingRule?.summary;
    if (summary) {
      frontmatterLines.push(`botmon:summary: "${summary}"`);
    }
  }

  frontmatterLines.push(`botmon:page_type: ${pageType}`);

  if (config.injectJsonLd) {
    const schema = generateSchema(pageType, "", context.url, matchingRule || null);
    if (schema) {
      frontmatterLines.push(`botmon:schema: ${schema["@type"]}`);
    }
  }

  if (frontmatterLines.length === 0) {
    return { modified: false, response };
  }

  const frontmatter = `---\n${frontmatterLines.join("\n")}\n---\n\n`;
  const modifiedText = frontmatter + text;

  const headers = new Headers(response.headers);
  headers.set("X-BotMon-GEO", "applied");
  headers.set("X-BotMon-PageType", pageType);

  return {
    modified: true,
    response: new Response(modifiedText, {
      status: response.status,
      headers,
    }),
    pageType,
  };
}

/**
 * Escape a string for use in HTML attribute values
 */
function escapeAttr(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
