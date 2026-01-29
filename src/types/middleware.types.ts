/**
 * Middleware Types
 *
 * Core types for the createCloudflareMiddleware() factory,
 * request context, and pipeline orchestration.
 */

import type { BotMonConfig } from "../types";
import type { ManagedRulesConfig } from "./managed-rules.types";
import type { TrafficType } from "./ingest-event.types";
import type { PageType } from "./geo.types";

/**
 * Middleware configuration extending the base SDK config
 */
export interface MiddlewareConfig extends BotMonConfig {
  /** Managed rules configuration (SDK code defaults) */
  managedRules?: ManagedRulesConfig;

  /** Hook called after response is generated (before returning to client) */
  onResponse?: (context: ResponseContext) => Promise<Response> | Response;

  /** BotMon API base URL for remote config */
  apiBaseUrl?: string;

  /** Remote config cache TTL in seconds (default: 300) */
  configCacheTtl?: number;
}

/**
 * Context object passed through the middleware pipeline
 */
export interface ResponseContext {
  /** Original incoming request */
  request: Request;
  /** Current response (may be modified by pipeline stages) */
  response: Response;
  /** Classified traffic type */
  trafficType: TrafficType;
  /** Detected bot name (if any) */
  botName?: string;
  /** Bot category (e.g. "search-engine", "ai-crawler") */
  botCategory?: string;
  /** Additional bot classification tags */
  botTags?: string[];
  /** Client country code (from cf.country) */
  country?: string;
  /** Parsed request URL */
  url: URL;
  /** Whether the request is from an AI bot */
  isAiBot: boolean;
  /** Detected page type (set by GEO engine) */
  pageType?: PageType;
  /** Cloudflare Worker env bindings */
  env: unknown;
  /** Cloudflare Worker execution context */
  ctx: ExecutionContext;
}

/**
 * Cloudflare Worker fetch handler signature
 */
export type CloudflareFetchHandler = (
  request: Request,
  env: unknown,
  ctx: ExecutionContext,
) => Promise<Response> | Response;

/**
 * The wrapped export default object for Cloudflare Workers
 */
export interface CloudflareWorkerExport {
  fetch: CloudflareFetchHandler;
}

/**
 * Internal pipeline stage result
 */
export interface PipelineStageResult {
  /** Whether this stage handled the request (short-circuits remaining stages) */
  handled: boolean;
  /** The response (if handled) */
  response?: Response;
  /** Error from this stage (non-fatal, logged and skipped) */
  error?: Error;
}

/**
 * Analytics event metadata added by middleware
 */
export interface MiddlewareAnalyticsMetadata {
  sdkVersion: string;
  middlewareEnabled: boolean;
  managedRulesApplied?: string[];
  geoPageType?: PageType;
  geoModified?: boolean;
}
