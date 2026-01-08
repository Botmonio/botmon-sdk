/**
 * BotMon SDK Types
 *
 * Re-exports types from local types folder and defines SDK-specific types.
 */

// Import types for use in this file
import type {
  RawRequestEvent,
  ClassifiedEvent,
  IngestEvent,
  IngestResponse,
  TrafficType,
  BotClassification,
  BaseEvent,
} from "./types/ingest-event.types";
import type { BotDetectionProvider } from "./types/provider.types";

// Re-export types for SDK consumers
export type {
  RawRequestEvent,
  ClassifiedEvent,
  IngestEvent,
  IngestResponse,
  TrafficType,
  BotClassification,
  BaseEvent,
};

/**
 * SDK Configuration
 */
export interface BotMonConfig {
  // Required (can also be set via env vars: BOTMON_API_KEY)
  apiKey?: string;                   // btmn_prod_xxx

  // Optional - API endpoint
  ingestUrl?: string;                // Default: https://analytics.botmon.io/ingest

  // Optional - Retry
  retryAttempts?: number;            // Default: 3
  retryBackoffMs?: number;           // Default: 1000
  retryMaxBackoffMs?: number;        // Default: 30000

  // Optional - Timeout
  timeoutMs?: number;                // Default: 5000

  // Optional - Debug
  debug?: boolean;                   // Default: false
  onError?: (error: Error, event?: RawRequestEvent) => void;

  /**
   * Bot detection provider (optional)
   * Specify which CDN provider you're using to automatically extract bot scores
   *
   * @default 'none'
   * @example 'cloudflare' - Extract from cf.botManagement
   * @example 'fastly' - Extract from Fastly bot detection headers
   */
  botDetectionProvider?: BotDetectionProvider;

  /**
   * Enable robots.txt body capture (optional)
   * When enabled, automatically captures the response body for /robots.txt requests.
   * Disabled by default for security - enable only if you need to analyze robots.txt content.
   *
   * @default false
   */
  captureRobotsTxt?: boolean;

  /**
   * Maximum size for robots.txt capture in bytes (optional)
   * Only applies when captureRobotsTxt is enabled.
   *
   * @default 10240 (10KB)
   */
  robotsTxtMaxSize?: number;
}

/**
 * Options for tracking an analytics event
 */
export interface TrackOptions {
  /** The incoming request */
  request: Request;

  /** The outgoing response (optional) */
  response?: Response;

  /** Start time for response time calculation (optional) */
  startTime?: number;

  /** Custom metadata to attach to the event (optional) */
  metadata?: Record<string, any>;

  /** robots.txt response body (optional, only for /robots.txt requests) */
  robotsTxtBody?: string;
}

/**
 * Flush result for a single event
 */
export interface FlushResult {
  success: boolean;
  eventId?: string;
  error?: string;
}

/**
 * Queue statistics
 */
export interface QueueStats {
  size: number;
  flushing: boolean;
  totalAdded: number;
  totalFlushed: number;
  totalDropped: number;
}

/**
 * Retry engine configuration
 */
export interface RetryConfig {
  retryAttempts: number;
  retryBackoffMs: number;
  retryMaxBackoffMs: number;
  debug?: boolean;
}

/**
 * HTTP client configuration
 */
export interface HttpClientConfig {
  apiKey: string;
  ingestUrl: string;
  debug?: boolean;
  timeoutMs?: number;
}

/**
 * Batch queue configuration
 */
export interface BatchQueueConfig {
  batchSize: number;
  flushIntervalMs: number;
  maxQueueSize: number;
  debug?: boolean;
  onError?: (error: Error, event?: RawRequestEvent) => void;
  onFlush?: (events: RawRequestEvent[], results: FlushResult[]) => void;
}

/**
 * Provider bot detection types
 */
export type { ProviderBotData, BotDetectionProvider } from "./types/provider.types";
