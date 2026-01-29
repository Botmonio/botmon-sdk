/**
 * robots.txt Managed Rule Handler
 *
 * Intercepts /robots.txt requests and serves managed content
 * using the configured mode (append, merge, replace, disabled).
 */

import type { ResponseContext } from "../types/middleware.types";
import type { ResolvedConfig } from "../types/managed-rules.types";
import { appendRobotsTxt, mergeRobotsTxt } from "./merge-utils";

type RobotsTxtConfig = ResolvedConfig["robotsTxt"];

/**
 * Handle a /robots.txt request based on the resolved configuration.
 */
export async function handleRobotsTxt(
  context: ResponseContext,
  config: RobotsTxtConfig,
  fetchOrigin: () => Promise<Response>,
): Promise<Response> {
  const botmonContent = config.content || "";

  switch (config.mode) {
    case "replace": {
      // Serve entirely from BotMon
      return new Response(botmonContent, {
        status: 200,
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "X-BotMon-Managed": "robots-txt",
          "X-BotMon-Mode": "replace",
        },
      });
    }

    case "append": {
      // Fetch origin, append BotMon content (treat non-200/non-text as empty)
      const originText = await fetchOriginText(fetchOrigin);
      const merged = appendRobotsTxt(originText, botmonContent);

      return new Response(merged, {
        status: 200,
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "X-BotMon-Managed": "robots-txt",
          "X-BotMon-Mode": "append",
        },
      });
    }

    case "merge": {
      // Fetch origin, intelligently merge (treat non-200/non-text as empty)
      const originText = await fetchOriginText(fetchOrigin);
      const merged = mergeRobotsTxt(originText, botmonContent);

      return new Response(merged, {
        status: 200,
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "X-BotMon-Managed": "robots-txt",
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
 * Fetch origin robots.txt, returning empty string if origin returns
 * non-200, non-text/plain content, or errors.
 */
async function fetchOriginText(
  fetchOrigin: () => Promise<Response>,
): Promise<string> {
  try {
    const response = await fetchOrigin();
    if (!response.ok) return "";
    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("text/plain")) return "";
    return await response.text();
  } catch {
    return "";
  }
}
