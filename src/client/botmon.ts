/**
 * BotMon SDK Client
 *
 * Main SDK class that provides a simple API for tracking analytics events.
 */

import { HttpClient } from "../utils/http-client";
import { RetryEngine } from "../core/retry-engine";
import type { BotMonConfig, TrackOptions, RawRequestEvent } from "../types";
import { createProviderAdapter, type ProviderAdapter } from "../types/provider.types";

/**
 * Sensitive query parameter patterns to blocklist
 * These are removed from query strings to prevent credential leakage
 */
const SENSITIVE_PARAM_PATTERNS = [
  /^token$/i,
  /^key$/i,
  /^password$/i,
  /^passwd$/i,
  /^secret$/i,
  /^auth$/i,
  /^authorization$/i,
  /^credential$/i,
  /^session$/i,
  /^jwt$/i,
  /^bearer$/i,
  /^api[_-]?key$/i,
  /^apikey$/i,
  /^access[_-]?token$/i,
  /^refresh[_-]?token$/i,
  /^private[_-]?key$/i,
  /^client[_-]?secret$/i,
];

/** Default max size for robots.txt capture (10KB) */
const DEFAULT_ROBOTS_TXT_MAX_SIZE = 10240;

/**
 * Sanitize query string by removing sensitive parameters
 */
function sanitizeQueryString(queryString: string | undefined): string | undefined {
  if (!queryString) return undefined;

  const params = new URLSearchParams(queryString);
  const sanitizedParams = new URLSearchParams();

  params.forEach((value, key) => {
    const isSensitive = SENSITIVE_PARAM_PATTERNS.some((pattern) =>
      pattern.test(key),
    );
    if (!isSensitive) {
      sanitizedParams.append(key, value);
    }
  });

  const result = sanitizedParams.toString();
  return result || undefined;
}

/**
 * BotMon SDK Client
 *
 * Provides a simple API for tracking analytics events in Cloudflare Workers.
 *
 * @example
 * ```typescript
 * const sdk = BotMon.init({
 *   apiKey: env.BOTMON_API_KEY,
 * });
 *
 * sdk.track(ctx, { request, response });
 * ```
 */
export class BotMon {
  private static instance: BotMon | null = null;
  private httpClient: HttpClient;
  private retryEngine: RetryEngine;
  private providerAdapter: ProviderAdapter;
  private config: Required<Omit<BotMonConfig, "onError">> & {
    onError?: BotMonConfig["onError"];
  };

  private constructor(config: Partial<BotMonConfig>, env?: any) {
    // Merge env vars with explicit config (explicit takes precedence)
    const finalConfig: BotMonConfig = {
      apiKey: config.apiKey || env?.BOTMON_API_KEY,
      ingestUrl:
        config.ingestUrl ||
        env?.BOTMON_INGEST_URL ||
        "https://analytics.botmon.io/ingest",
      retryAttempts: config.retryAttempts ?? 3,
      retryBackoffMs: config.retryBackoffMs ?? 1000,
      retryMaxBackoffMs: config.retryMaxBackoffMs ?? 30000,
      timeoutMs: config.timeoutMs ?? 5000,
      debug: config.debug ?? false,
      onError: config.onError,
      captureRobotsTxt: config.captureRobotsTxt ?? false,
      robotsTxtMaxSize: config.robotsTxtMaxSize ?? DEFAULT_ROBOTS_TXT_MAX_SIZE,
    };

    // Validate required fields
    if (!finalConfig.apiKey) {
      throw new Error(
        "[BotMon] apiKey is required. Provide it via config or set env.BOTMON_API_KEY",
      );
    }

    // Validate API key format (basic validation - non-empty string)
    if (typeof finalConfig.apiKey !== "string" || finalConfig.apiKey.trim().length === 0) {
      throw new Error("[BotMon] apiKey must be a non-empty string");
    }

    // Validate ingestUrl is HTTPS (security requirement)
    if (finalConfig.ingestUrl && !finalConfig.ingestUrl.startsWith("https://")) {
      throw new Error(
        "[BotMon] ingestUrl must use HTTPS for security. " +
        "Received: " + finalConfig.ingestUrl.substring(0, 50),
      );
    }

    this.config = finalConfig as Required<Omit<BotMonConfig, "onError">> & {
      onError?: BotMonConfig["onError"];
    };

    // Initialize HTTP client
    this.httpClient = new HttpClient({
      apiKey: this.config.apiKey,
      ingestUrl: this.config.ingestUrl,
      debug: this.config.debug,
      timeoutMs: this.config.timeoutMs,
    });

    // Initialize retry engine
    this.retryEngine = new RetryEngine({
      retryAttempts: this.config.retryAttempts,
      retryBackoffMs: this.config.retryBackoffMs,
      retryMaxBackoffMs: this.config.retryMaxBackoffMs,
      debug: this.config.debug,
    });

    // Initialize provider adapter (for extracting upstream bot scores)
    this.providerAdapter = createProviderAdapter(
      config.botDetectionProvider || "none",
    );
  }

  /**
   * Initialize SDK (singleton pattern)
   *
   * Returns the same instance on subsequent calls. To create a new instance,
   * call dispose() first.
   *
   * @param config - SDK configuration (optional if env vars are set)
   * @returns BotMon instance
   *
   * @example
   * ```typescript
   * // Auto-init from env vars
   * const sdk = BotMon.init();
   *
   * // Explicit config
   * const sdk = BotMon.init({
   *   apiKey: 'btmn_prod_xxx',
   * });
   * ```
   */
  static init(config?: Partial<BotMonConfig>): BotMon {
    if (BotMon.instance) {
      return BotMon.instance;
    }

    // Try to access env vars from globalThis (Cloudflare Workers pattern)
    // This allows auto-init when env vars are set
    let env: any;
    try {
      env =
        typeof globalThis !== "undefined" ? (globalThis as any).env : undefined;
    } catch {
      // Ignore errors if globalThis.env is not accessible
      env = undefined;
    }

    BotMon.instance = new BotMon(config || {}, env);
    return BotMon.instance;
  }

  /**
   * Track an analytics event
   *
   * Automatically extracts data from request/response and sends it to the
   * BotMon analytics API. Uses ctx.waitUntil() internally so it doesn't
   * block the response.
   *
   * **Security Features:**
   * - Query strings are automatically sanitized to remove sensitive parameters
   *   (tokens, passwords, API keys, etc.)
   * - robots.txt capture is opt-in only (set captureRobotsTxt: true in config)
   *
   * @param ctx - ExecutionContext from Cloudflare Workers
   * @param options - Track options with request and optional response
   *
   * @example
   * ```typescript
   * // Track with response
   * sdk.track(ctx, { request, response });
   *
   * // Track with response time
   * const startTime = performance.now();
   * const response = await handleRequest(request);
   * sdk.track(ctx, { request, response, startTime });
   *
   * // Track with metadata
   * sdk.track(ctx, {
   *   request,
   *   response,
   *   metadata: { userId: '123', plan: 'premium' }
   * });
   * ```
   */
  track(ctx: any, options: TrackOptions): void {
    // Use ctx.waitUntil to send event after response
    // Build event inside waitUntil to handle async robots.txt capture
    ctx.waitUntil(
      this.buildEvent(options)
        .then((event) => this.sendEvent(event))
        .catch((err) => {
          const error = new Error(`BotMon tracking failed: ${err.message}`);

          if (this.config.onError) {
            // Call custom error handler if provided
            // Note: event might not be available if buildEvent failed
            this.config.onError(error, undefined as any);
          } else if (this.config.debug) {
            // Log error in debug mode
            console.error("[BotMon]", error);
          }
          // Otherwise silently fail (tracking failures shouldn't crash the worker)
        }),
    );
  }

  /**
   * Dispose the singleton instance
   *
   * Call this to reset the singleton and allow creating a new instance.
   * Useful for testing or when you need to reinitialize with different config.
   */
  dispose(): void {
    BotMon.instance = null;
  }

  /**
   * Build event from request/response context
   *
   * Automatically extracts relevant fields from the Request and Response objects.
   * If captureRobotsTxt is enabled and the request path is /robots.txt,
   * captures the response body (up to robotsTxtMaxSize bytes).
   */
  private async buildEvent(options: TrackOptions): Promise<RawRequestEvent> {
    const { request, response, startTime, metadata, robotsTxtBody } = options;

    // Parse URL
    const url = new URL(request.url);

    // Extract Cloudflare-specific properties (if available)
    const cf = (request as any).cf;

    // Extract provider bot data using configured adapter
    const extracted = this.providerAdapter.extractBotData(request);
    const providerBotData = extracted ? extracted : undefined;

    // robots.txt capture (opt-in only)
    let capturedRobotsTxtBody = robotsTxtBody; // Use explicitly provided value if present
    const shouldCaptureRobotsTxt =
      this.config.captureRobotsTxt &&
      !capturedRobotsTxtBody &&
      url.pathname === "/robots.txt" &&
      response;

    if (shouldCaptureRobotsTxt) {
      try {
        if (this.config.debug) {
          console.log("[BotMon] Capturing robots.txt body (opt-in enabled)");
        }

        // Clone response to avoid consuming the body
        const clonedResponse = response.clone();
        capturedRobotsTxtBody = await clonedResponse.text();

        // Enforce size limit
        const maxSize = this.config.robotsTxtMaxSize;
        if (capturedRobotsTxtBody.length > maxSize) {
          if (this.config.debug) {
            console.log(
              `[BotMon] Truncating robots.txt from ${capturedRobotsTxtBody.length} to ${maxSize} bytes`,
            );
          }
          capturedRobotsTxtBody = capturedRobotsTxtBody.substring(0, maxSize);
        }

        if (this.config.debug) {
          console.log("[BotMon] Captured robots.txt body:", {
            hostname: url.hostname,
            contentLength: capturedRobotsTxtBody.length,
          });
        }
      } catch (err) {
        if (this.config.debug) {
          console.error(
            "[BotMon] Failed to capture robots.txt body:",
            (err as Error)?.message,
          );
        }
        // Silently fail - don't let robots.txt capture errors break tracking
      }
    }

    // Sanitize query string to remove sensitive parameters
    const rawQueryString = url.search ? url.search.substring(1) : undefined;
    const sanitizedQueryString = sanitizeQueryString(rawQueryString);

    return {
      type: "raw",

      // URL information (for domain discovery)
      url: request.url,
      hostname: url.hostname,

      // Request identification
      requestId: crypto.randomUUID(),
      timestamp: new Date().toISOString(),

      // HTTP request
      method: request.method,
      path: url.pathname,
      queryString: sanitizedQueryString,

      // HTTP response
      statusCode: response?.status,
      responseTimeMs: startTime
        ? Math.round(performance.now() - startTime)
        : undefined,

      // Cloudflare context
      clientIp: request.headers.get("CF-Connecting-IP") || undefined,
      clientCountry: cf?.country || undefined,
      userAgent: request.headers.get("User-Agent") || undefined,
      referer: request.headers.get("Referer") || undefined,

      // Custom metadata
      metadata,

      // Provider bot detection data (NEW)
      providerBotData,

      // robots.txt content capture (automatically captured or manually provided)
      robotsTxtBody: capturedRobotsTxtBody,
    };
  }

  /**
   * Send event with retry logic
   */
  private async sendEvent(event: RawRequestEvent): Promise<void> {
    await this.retryEngine.executeWithRetry(
      () => this.httpClient.sendEvent(event),
      `${event.method} ${event.path}`,
    );
  }
}
