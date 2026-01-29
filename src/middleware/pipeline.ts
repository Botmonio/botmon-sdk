/**
 * Middleware Pipeline Orchestrator
 *
 * Runs managed rules sequentially with error isolation.
 * Each rule is wrapped in try/catch so failures don't break the pipeline.
 */

import type { ResponseContext, PipelineStageResult } from "../types/middleware.types";
import type { ResolvedConfig } from "../types/managed-rules.types";
import { handleRobotsTxt } from "../managed-rules/robots-txt";
import { handleSitemap } from "../managed-rules/sitemap";
import { handleWellKnown } from "../managed-rules/well-known";
import { applyGeoOptimization } from "../geo/index";

/**
 * Pipeline stage definition
 */
interface PipelineStage {
  name: string;
  run: (
    context: ResponseContext,
    config: ResolvedConfig,
    originFetch: () => Promise<Response>,
  ) => Promise<PipelineStageResult>;
}

/**
 * Run the managed rules pipeline.
 *
 * Stages run sequentially. If a stage "handles" the request (e.g. serves
 * a managed robots.txt), remaining stages are skipped.
 *
 * Returns the final response (potentially modified) and a list of applied rules.
 */
export async function runPipeline(
  context: ResponseContext,
  config: ResolvedConfig,
  originFetch: () => Promise<Response>,
): Promise<{ response: Response; appliedRules: string[] }> {
  const appliedRules: string[] = [];

  const stages: PipelineStage[] = [
    {
      name: "robots-txt",
      run: async (ctx, cfg, fetchOrigin) => {
        if (!cfg.robotsTxt.enabled || cfg.robotsTxt.mode === "disabled") {
          return { handled: false };
        }
        if (ctx.url.pathname !== "/robots.txt") {
          return { handled: false };
        }
        const response = await handleRobotsTxt(ctx, cfg.robotsTxt, fetchOrigin);
        return { handled: true, response };
      },
    },
    {
      name: "sitemap",
      run: async (ctx, cfg, fetchOrigin) => {
        if (!cfg.sitemap.enabled || cfg.sitemap.mode === "disabled") {
          return { handled: false };
        }
        const sitemapPattern = /^\/sitemap(-[\w-]+)?\.xml$/;
        if (!sitemapPattern.test(ctx.url.pathname)) {
          return { handled: false };
        }
        const response = await handleSitemap(ctx, cfg.sitemap, fetchOrigin);
        return { handled: true, response };
      },
    },
    {
      name: "well-known",
      run: async (ctx, cfg) => {
        if (!cfg.wellKnown.enabled) {
          return { handled: false };
        }
        if (!ctx.url.pathname.startsWith("/.well-known/")) {
          return { handled: false };
        }
        const filename = ctx.url.pathname.replace("/.well-known/", "");
        const fileConfig = cfg.wellKnown.files[filename];
        if (!fileConfig || fileConfig.mode === "disabled") {
          return { handled: false };
        }
        const response = handleWellKnown(filename, fileConfig);
        return { handled: true, response };
      },
    },
  ];

  // Run pre-origin stages (managed file interception)
  for (const stage of stages) {
    try {
      const result = await stage.run(context, config, originFetch);
      if (result.handled && result.response) {
        appliedRules.push(stage.name);
        return { response: result.response, appliedRules };
      }
    } catch (error) {
      // Non-fatal: log and continue to next stage
      console.error(`[BotMon] Pipeline stage "${stage.name}" failed:`, error);
    }
  }

  // No managed file matched — use the origin response from context
  let response = context.response;

  // Post-origin: GEO optimization (AI bots only)
  if (config.geo.enabled && context.isAiBot) {
    try {
      const geoResult = await applyGeoOptimization(response, context, config.geo);
      if (geoResult.modified) {
        response = geoResult.response;
        appliedRules.push("geo");
        context.pageType = geoResult.pageType;
      }
    } catch (error) {
      console.error("[BotMon] GEO optimization failed:", error);
    }
  }

  return { response, appliedRules };
}
