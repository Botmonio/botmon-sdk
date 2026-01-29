/**
 * Sitemap Managed Rule Handler
 *
 * Intercepts /sitemap.xml and /sitemap-*.xml requests and serves
 * managed content using the configured mode.
 */

import type { ResponseContext } from "../types/middleware.types";
import type { ResolvedConfig } from "../types/managed-rules.types";
import { mergeSitemapXml } from "./merge-utils";

type SitemapConfig = ResolvedConfig["sitemap"];

/**
 * Handle a sitemap request based on the resolved configuration.
 */
export async function handleSitemap(
  context: ResponseContext,
  config: SitemapConfig,
  fetchOrigin: () => Promise<Response>,
): Promise<Response> {
  const botmonContent = config.content || "";

  switch (config.mode) {
    case "replace": {
      // Serve entirely from BotMon
      return new Response(botmonContent, {
        status: 200,
        headers: {
          "Content-Type": "application/xml; charset=utf-8",
          "X-BotMon-Managed": "sitemap",
          "X-BotMon-Mode": "replace",
        },
      });
    }

    case "merge": {
      // Fetch origin, merge URLs (treat non-200/non-XML as empty)
      const originXml = await fetchOriginXml(fetchOrigin);
      const merged = mergeSitemapXml(originXml, botmonContent);

      return new Response(merged, {
        status: 200,
        headers: {
          "Content-Type": "application/xml; charset=utf-8",
          "X-BotMon-Managed": "sitemap",
          "X-BotMon-Mode": "merge",
        },
      });
    }

    case "append": {
      // For sitemaps, append is treated as merge (treat non-200/non-XML as empty)
      const originXml = await fetchOriginXml(fetchOrigin);
      const merged = mergeSitemapXml(originXml, botmonContent);

      return new Response(merged, {
        status: 200,
        headers: {
          "Content-Type": "application/xml; charset=utf-8",
          "X-BotMon-Managed": "sitemap",
          "X-BotMon-Mode": "merge",
        },
      });
    }

    default: {
      // disabled or unknown — return origin response
      return context.response;
    }
  }
}

/**
 * Fetch origin sitemap, returning empty string if origin returns
 * non-200, non-XML content, or errors.
 */
async function fetchOriginXml(
  fetchOrigin: () => Promise<Response>,
): Promise<string> {
  try {
    const response = await fetchOrigin();
    if (!response.ok) return "";
    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("xml")) return "";
    return await response.text();
  } catch {
    return "";
  }
}
