/**
 * .well-known Managed Rule Handler
 *
 * Serves only explicitly configured .well-known files.
 * All other .well-known/* paths pass through to origin.
 */

import type { ResolvedConfig } from "../types/managed-rules.types";

type WellKnownFileConfig = ResolvedConfig["wellKnown"]["files"][string];

/**
 * Content-Type map for common .well-known files
 */
const CONTENT_TYPE_MAP: Record<string, string> = {
  "ai-plugin.json": "application/json; charset=utf-8",
  "llms.txt": "text/plain; charset=utf-8",
  "security.txt": "text/plain; charset=utf-8",
  "robots.txt": "text/plain; charset=utf-8",
};

/**
 * Infer content type from filename
 */
function inferContentType(filename: string): string {
  if (CONTENT_TYPE_MAP[filename]) {
    return CONTENT_TYPE_MAP[filename];
  }
  if (filename.endsWith(".json")) return "application/json; charset=utf-8";
  if (filename.endsWith(".txt")) return "text/plain; charset=utf-8";
  if (filename.endsWith(".xml")) return "application/xml; charset=utf-8";
  return "text/plain; charset=utf-8";
}

/**
 * Handle a .well-known file request.
 * Only called for explicitly configured files (unconfigured paths pass through).
 */
export function handleWellKnown(
  filename: string,
  config: WellKnownFileConfig,
): Response {
  if (config.mode === "disabled" || !config.content) {
    // No content to serve — this shouldn't normally be reached
    // because the pipeline checks mode before calling this
    return new Response("Not Found", { status: 404 });
  }

  return new Response(config.content, {
    status: 200,
    headers: {
      "Content-Type": inferContentType(filename),
      "X-BotMon-Managed": "well-known",
      "X-BotMon-File": filename,
    },
  });
}
