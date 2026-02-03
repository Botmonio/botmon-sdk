/**
 * BotMon Cloudflare Workers SDK
 *
 * Track analytics events from Cloudflare Workers to BotMon.
 * v0.7.0: Edge proxy middleware with managed files and GEO optimization.
 */

// Export main SDK class
export { BotMon } from "./client/botmon";

// Export low-level classes (for advanced users)
export { RetryEngine } from "./core/retry-engine";
export { HttpClient } from "./utils/http-client";

// Export middleware (new in v0.7.0)
export { createCloudflareMiddleware } from "./middleware/cloudflare";

// Export types — existing
export type {
  BotMonConfig,
  TrackOptions,
  RetryConfig,
  HttpClientConfig,
  RawRequestEvent,
  ClassifiedEvent,
  IngestEvent,
  IngestResponse,
  FlushResult,
  QueueStats,
  TrafficType,
  BotClassification,
  BaseEvent,
} from "./types";

// Export types — middleware (new in v0.7.0)
export type {
  MiddlewareConfig,
  ResponseContext,
} from "./types/middleware.types";

// Export types — managed rules (new in v0.7.0)
export type {
  ManagedRulesConfig,
  RobotsTxtRuleConfig,
  SitemapRuleConfig,
  WellKnownRuleConfig,
  ManagedFileMode,
  RemoteConfigBundle,
} from "./types/managed-rules.types";

// Export types — GEO (new in v0.7.0)
export type {
  GeoRuleConfig,
  GeoPageRule,
  PageType,
  SchemaType,
} from "./types/geo.types";

// SDK version - matches package.json
export const SDK_VERSION = "0.8.0";
