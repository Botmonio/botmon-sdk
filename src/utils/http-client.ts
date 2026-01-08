/**
 * HTTP Client
 *
 * Wrapper around fetch for making API calls to BotMon ingest endpoint.
 */

import type { RawRequestEvent, IngestResponse, HttpClientConfig } from "../types";

/** Default timeout in milliseconds */
const DEFAULT_TIMEOUT_MS = 5000;

export class HttpClient {
  private timeoutMs: number;

  constructor(private config: HttpClientConfig) {
    this.timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  }

  /**
   * Send single event to ingest API
   *
   * @param event - The raw request event to send
   * @returns Promise that resolves with the ingest response
   * @throws Error if the API request fails or returns non-success response
   */
  async sendEvent(event: RawRequestEvent): Promise<IngestResponse> {
    const startTime = performance.now();

    // Create AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(this.config.ingestUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": this.config.apiKey,
        },
        body: JSON.stringify(event),
        signal: controller.signal,
      });

      // Parse response
      const data = await response.json() as IngestResponse;

      if (this.config.debug) {
        console.log(
          `[BotMon] Event sent in ${(performance.now() - startTime).toFixed(2)}ms:`,
          {
            success: data.success,
            eventId: data.eventId,
            path: event.path,
          },
        );
      }

      // Check if request was successful
      if (!response.ok) {
        throw new Error(
          data.error || `HTTP ${response.status}: ${response.statusText}`,
        );
      }

      // Check if the ingest was successful
      if (!data.success) {
        throw new Error(data.error || "Ingest failed without error message");
      }

      return data;
    } catch (error) {
      // Handle abort errors (timeout)
      if (error instanceof Error && error.name === "AbortError") {
        const timeoutError = new Error(
          `[BotMon] Request timed out after ${this.timeoutMs}ms`,
        );
        if (this.config.debug) {
          console.error(timeoutError.message);
        }
        throw timeoutError;
      }

      if (this.config.debug) {
        console.error(
          `[BotMon] Event send failed after ${(performance.now() - startTime).toFixed(2)}ms`,
        );
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
