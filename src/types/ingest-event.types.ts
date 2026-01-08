/**
 * Analytics Event Types
 *
 * Defines the schema for analytics ingest events supporting both
 * raw HTTP request data and pre-classified bot events.
 */

/**
 * Traffic classification types
 */
export type TrafficType = "human" | "good_bot" | "bad_bot" | "security_scanner" | "unknown";

/**
 * Base event fields common to all event types
 */
export interface BaseEvent {
  // URL information (for domain discovery)
  url: string;               // Full URL: https://example.com/path?query
  hostname: string;          // Extracted hostname: example.com

  // Request identification
  timestamp?: string;        // ISO-8601 format, defaults to NOW if not provided
  requestId?: string;        // Unique request identifier

  // HTTP metadata
  method: string;            // GET, POST, PUT, DELETE, etc.
  path: string;              // Request path
  queryString?: string;
  statusCode?: number;

  // Client data
  clientIp?: string;
  clientCountry?: string;    // ISO country code (US, GB, etc.)
  userAgent?: string;
  referer?: string;

  // Performance
  responseTimeMs?: number;
  bytesSent?: number;
  bytesReceived?: number;

  // Extensibility
  metadata?: Record<string, any>;

  // Provider bot detection data (optional)
  providerBotData?: {
    score?: number;           // Upstream provider bot score (0-100)
    verified?: boolean;       // Is this a verified bot
    classification?: string;  // Provider's classification
    provider: string;         // Provider name ('cloudflare', 'fastly', etc.)
  };

  // robots.txt content capture (optional)
  robotsTxtBody?: string;     // Response body when path is /robots.txt
}

/**
 * Raw HTTP request event (requires bot classification)
 */
export interface RawRequestEvent extends BaseEvent {
  type: "raw";
}

/**
 * Pre-classified event (bot classification already done)
 */
export interface ClassifiedEvent extends BaseEvent {
  type: "classified";
  trafficType: TrafficType;
  botScore?: number;         // 0-100 (0=definitely bot, 100=definitely human)
  botName?: string;          // Name of identified bot (e.g., 'Googlebot')
  orgId?: string;            // Added by worker after auth
}

/**
 * Union type for all ingest events
 */
export type IngestEvent = RawRequestEvent | ClassifiedEvent;

/**
 * Bot classification result
 */
export interface BotClassification {
  type: TrafficType;
  score: number;             // 0-100
  botName?: string;
  confidence: "high" | "medium" | "low";
}

/**
 * Ingest response
 */
export interface IngestResponse {
  success: boolean;
  stored: {
    analyticsEngine: boolean;
    postgres: boolean;
  };
  eventId?: string;
  error?: string;
}
