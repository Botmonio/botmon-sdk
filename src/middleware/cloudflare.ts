/**
 * Cloudflare Middleware Factory
 *
 * Creates a middleware that wraps the customer's Cloudflare Worker fetch handler.
 * Intercepts requests, serves managed files, applies GEO optimization,
 * and tracks analytics — all transparently.
 *
 * @example
 * ```typescript
 * export default createCloudflareMiddleware({
 *   apiKey: env.BOTMON_API_KEY,
 *   managedRules: {
 *     robotsTxt: { enabled: true, mode: "append" },
 *     geo: { enabled: true, injectJsonLd: true, injectSummary: true },
 *   },
 * })(async (request, env, ctx) => fetch(request));
 * ```
 */

import type {
  MiddlewareConfig,
  CloudflareFetchHandler,
  CloudflareWorkerExport,
  MiddlewareAnalyticsMetadata,
} from "../types/middleware.types";
import { buildContext } from "./context";
import { runPipeline } from "./pipeline";
import { fetchConfig } from "../managed-rules/api-client";
import { mergeConfig } from "../managed-rules/config-merger";
import { BotMon } from "../client/botmon";
import { SDK_VERSION } from "../index";

/**
 * Default API base URL for remote config
 */
const DEFAULT_API_BASE_URL = "https://app.botmon.io/api";

/**
 * Default config cache TTL (5 minutes)
 */
const DEFAULT_CONFIG_CACHE_TTL = 300;

/**
 * Create a Cloudflare Workers middleware that wraps a fetch handler.
 *
 * Returns a function that accepts the customer's fetch handler and returns
 * a Cloudflare Worker export (`{ fetch }`) with BotMon middleware applied.
 */
export function createCloudflareMiddleware(
  config: MiddlewareConfig,
): (handler: CloudflareFetchHandler) => CloudflareWorkerExport {
  return (handler: CloudflareFetchHandler): CloudflareWorkerExport => {
    return {
      fetch: async (
        request: Request,
        env: unknown,
        ctx: ExecutionContext,
      ): Promise<Response> => {
        const startTime = performance.now();

        try {
          // Resolve API key from config or env
          const apiKey = config.apiKey || (env as any)?.BOTMON_API_KEY;
          if (!apiKey) {
            // No API key — pass through to origin without middleware
            return handler(request, env, ctx);
          }

          const url = new URL(request.url);
          const hostname = url.hostname;

          // Fetch remote config (edge cached, single bundle per hostname)
          const apiBaseUrl = config.apiBaseUrl || DEFAULT_API_BASE_URL;
          const cacheTtl = config.configCacheTtl ?? DEFAULT_CONFIG_CACHE_TTL;
          const remoteConfig = await fetchConfig(hostname, apiKey, apiBaseUrl, cacheTtl);

          // Merge: SDK code defaults + dashboard overrides (dashboard wins)
          const resolvedConfig = mergeConfig(config.managedRules || {}, remoteConfig);

          // Define origin fetch (lazy — only called if no managed file matches)
          const originFetch = async () => handler(request, env, ctx);

          // Call origin to get the response for context building
          // (Pipeline stages that intercept will short-circuit before using it)
          const originResponse = await originFetch();

          // Build request context
          const context = buildContext(request, originResponse, env, ctx);

          // Run managed rules pipeline
          const { response, appliedRules } = await runPipeline(
            context,
            resolvedConfig,
            originFetch,
          );

          // Apply onResponse hook if configured
          let finalResponse = response;
          if (config.onResponse) {
            try {
              context.response = response;
              finalResponse = await config.onResponse(context);
            } catch (error) {
              console.error("[BotMon] onResponse hook failed:", error);
              finalResponse = response;
            }
          }

          // Track analytics (non-blocking via waitUntil)
          try {
            const sdk = BotMon.init({
              apiKey,
              ingestUrl: config.ingestUrl,
              debug: config.debug,
            });

            const analyticsMetadata: MiddlewareAnalyticsMetadata = {
              sdkVersion: SDK_VERSION,
              middlewareEnabled: true,
              managedRulesApplied: appliedRules.length > 0 ? appliedRules : undefined,
              geoPageType: context.pageType,
              geoModified: appliedRules.includes("geo"),
            };

            sdk.track(ctx, {
              request,
              response: finalResponse,
              startTime,
              metadata: analyticsMetadata,
            });
          } catch (error) {
            // Analytics failure should never break the response
            if (config.debug) {
              console.error("[BotMon] Analytics tracking failed:", error);
            }
          }

          return finalResponse;
        } catch (error) {
          // Graceful degradation: if anything fails, pass through to origin
          if (config.debug) {
            console.error("[BotMon] Middleware error, falling through to origin:", error);
          }
          return handler(request, env, ctx);
        }
      },
    };
  };
}
