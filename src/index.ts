/**
 * BotMon Cloudflare Workers SDK
 *
 * Track analytics events from Cloudflare Workers to BotMon.
 */

// Export main SDK class
export { BotMon } from "./client/botmon";

// Export low-level classes (for advanced users)
export { RetryEngine } from "./core/retry-engine";
export { HttpClient } from "./utils/http-client";

// Export types
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

// SDK version
export const SDK_VERSION = "0.6.0-alpha";
