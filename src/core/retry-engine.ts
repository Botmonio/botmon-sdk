/**
 * Retry Engine
 *
 * Provides exponential backoff with jitter for failed API calls.
 */

import type { RetryConfig } from "../types";

export class RetryEngine {
  constructor(private config: RetryConfig) {}

  /**
   * Execute function with retry logic
   *
   * @param fn - Function to execute
   * @param context - Optional context string for debug logging
   * @returns Promise that resolves with the function result
   * @throws Error if all retry attempts fail
   */
  async executeWithRetry<T>(
    fn: () => Promise<T>,
    context?: string,
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 0; attempt <= this.config.retryAttempts; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;

        // If this was the last attempt, throw the error
        if (attempt >= this.config.retryAttempts) {
          if (this.config.debug) {
            console.log(
              `[BotMon] Retry failed after ${attempt + 1} attempts${
                context ? ` (${context})` : ""
              }`,
            );
          }
          throw lastError;
        }

        // Calculate delay with exponential backoff
        const delay = this.calculateDelay(attempt);

        if (this.config.debug) {
          console.log(
            `[BotMon] Retry attempt ${attempt + 1}/${
              this.config.retryAttempts
            } after ${delay}ms${context ? ` (${context})` : ""}`,
          );
        }

        // Wait before retrying
        await this.sleep(delay);
      }
    }

    // This should never be reached, but TypeScript needs it
    throw lastError!;
  }

  /**
   * Calculate delay with exponential backoff + jitter
   *
   * Formula: min(baseDelay * 2^attempt, maxDelay) + jitter
   * Jitter: ±25% of calculated delay
   */
  private calculateDelay(attempt: number): number {
    // Exponential backoff: baseDelay * 2^attempt
    const baseDelay = this.config.retryBackoffMs * Math.pow(2, attempt);

    // Cap at max backoff
    const cappedDelay = Math.min(baseDelay, this.config.retryMaxBackoffMs);

    // Add jitter: ±25% of the delay
    const jitter = cappedDelay * 0.25 * (Math.random() * 2 - 1);

    // Ensure non-negative and return as integer
    return Math.max(0, Math.floor(cappedDelay + jitter));
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
