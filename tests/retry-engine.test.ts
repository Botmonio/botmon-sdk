import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { RetryEngine } from "../src/core/retry-engine";

describe("RetryEngine", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe("executeWithRetry", () => {
    it("should succeed on first attempt", async () => {
      const engine = new RetryEngine({
        retryAttempts: 3,
        retryBackoffMs: 100,
        retryMaxBackoffMs: 1000,
      });

      const fn = vi.fn().mockResolvedValue("success");
      const result = await engine.executeWithRetry(fn);

      expect(result).toBe("success");
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it("should retry and eventually succeed", async () => {
      const engine = new RetryEngine({
        retryAttempts: 3,
        retryBackoffMs: 10,
        retryMaxBackoffMs: 100,
      });

      let attempts = 0;
      const fn = vi.fn().mockImplementation(async () => {
        attempts++;
        if (attempts < 3) {
          throw new Error("Temporary failure");
        }
        return "success";
      });

      const promise = engine.executeWithRetry(fn);

      // Fast-forward through retry delays
      await vi.runAllTimersAsync();

      const result = await promise;

      expect(result).toBe("success");
      expect(fn).toHaveBeenCalledTimes(3);
    });

    it("should throw after max retries", async () => {
      const engine = new RetryEngine({
        retryAttempts: 2,
        retryBackoffMs: 10,
        retryMaxBackoffMs: 100,
      });

      const fn = vi.fn().mockRejectedValue(new Error("Failed"));

      const promise = engine.executeWithRetry(fn).catch((e) => e);

      // Fast-forward through retry delays
      await vi.runAllTimersAsync();

      const result = await promise;
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe("Failed");
      expect(fn).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });

    it("should apply exponential backoff", async () => {
      const engine = new RetryEngine({
        retryAttempts: 3,
        retryBackoffMs: 100,
        retryMaxBackoffMs: 10000,
      });

      const delays: number[] = [];
      const setTimeoutSpy = vi.spyOn(global, "setTimeout");

      const fn = vi.fn().mockRejectedValue(new Error("Test"));

      // eslint-disable-next-line @typescript-eslint/no-empty-function
      const promise = engine.executeWithRetry(fn).catch(() => {});

      // Fast-forward through retry delays
      await vi.runAllTimersAsync();

      await promise;

      // Collect actual delays from setTimeout calls
      setTimeoutSpy.mock.calls.forEach((call) => {
        if (typeof call[1] === "number" && call[1] > 0) {
          delays.push(call[1]);
        }
      });

      // Should have 3 delays (for 3 retries)
      expect(delays.length).toBeGreaterThanOrEqual(3);

      // Verify exponential growth pattern (allowing for jitter)
      // First delay ~100ms, second ~200ms, third ~400ms
      // With ±25% jitter, we expect:
      // First: 75-125ms, Second: 150-250ms, Third: 300-500ms
      expect(delays[0]).toBeGreaterThanOrEqual(50);
      expect(delays[0]).toBeLessThanOrEqual(150);

      expect(delays[1]).toBeGreaterThanOrEqual(100);
      expect(delays[1]).toBeLessThanOrEqual(300);

      expect(delays[2]).toBeGreaterThanOrEqual(200);
      expect(delays[2]).toBeLessThanOrEqual(600);

      // Each delay should be larger than the previous (on average)
      // We check that at least one of the later delays is larger
      const hasIncreasingPattern =
        delays[1] > delays[0] * 0.8 || delays[2] > delays[1] * 0.8;
      expect(hasIncreasingPattern).toBe(true);
    });

    it("should respect max backoff cap", async () => {
      const engine = new RetryEngine({
        retryAttempts: 5,
        retryBackoffMs: 1000,
        retryMaxBackoffMs: 2000, // Cap at 2 seconds
      });

      const delays: number[] = [];
      const setTimeoutSpy = vi.spyOn(global, "setTimeout");

      const fn = vi.fn().mockRejectedValue(new Error("Test"));

      // eslint-disable-next-line @typescript-eslint/no-empty-function
      const promise = engine.executeWithRetry(fn).catch(() => {});
      await vi.runAllTimersAsync();

      await promise;

      // Collect delays
      setTimeoutSpy.mock.calls.forEach((call) => {
        if (typeof call[1] === "number" && call[1] > 0) {
          delays.push(call[1]);
        }
      });

      // All delays should be <= maxBackoffMs + jitter (2000 * 1.25 = 2500)
      delays.forEach((delay) => {
        expect(delay).toBeLessThanOrEqual(2500);
      });
    });

    it("should support debug logging", async () => {
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      const engine = new RetryEngine({
        retryAttempts: 2,
        retryBackoffMs: 10,
        retryMaxBackoffMs: 100,
        debug: true,
      });

      const fn = vi.fn().mockRejectedValue(new Error("Test"));

      // eslint-disable-next-line @typescript-eslint/no-empty-function
      const promise = engine.executeWithRetry(fn, "test context").catch(() => {});
      await vi.runAllTimersAsync();

      await promise;

      // Should log retry attempts
      expect(consoleSpy).toHaveBeenCalled();
      expect(consoleSpy.mock.calls.some((call) =>
        call[0].includes("Retry attempt"),
      )).toBe(true);
      expect(consoleSpy.mock.calls.some((call) =>
        call[0].includes("test context"),
      )).toBe(true);

      consoleSpy.mockRestore();
    });

    it("should handle context parameter", async () => {
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      const engine = new RetryEngine({
        retryAttempts: 1,
        retryBackoffMs: 10,
        retryMaxBackoffMs: 100,
        debug: true,
      });

      const fn = vi.fn().mockRejectedValue(new Error("Test"));

      // eslint-disable-next-line @typescript-eslint/no-empty-function
      const promise = engine.executeWithRetry(fn, "custom context").catch(() => {});
      await vi.runAllTimersAsync();

      await promise;

      expect(consoleSpy.mock.calls.some((call) =>
        call[0].includes("custom context"),
      )).toBe(true);

      consoleSpy.mockRestore();
    });

    it("should handle async function errors", async () => {
      const engine = new RetryEngine({
        retryAttempts: 1,
        retryBackoffMs: 10,
        retryMaxBackoffMs: 100,
      });

      const fn = vi.fn().mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 1));
        throw new Error("Async error");
      });

      const promise = engine.executeWithRetry(fn).catch((e) => e);
      await vi.runAllTimersAsync();

      const result = await promise;
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe("Async error");
      expect(fn).toHaveBeenCalledTimes(2); // Initial + 1 retry
    });
  });

  describe("calculateDelay", () => {
    it("should add jitter to delay", () => {
      const engine = new RetryEngine({
        retryAttempts: 3,
        retryBackoffMs: 1000,
        retryMaxBackoffMs: 10000,
      });

      // Calculate multiple delays to check for variance
      const delays: number[] = [];
      for (let i = 0; i < 10; i++) {
        // Access private method via type assertion for testing
        const delay = (engine as any).calculateDelay(0);
        delays.push(delay);
      }

      // Check that we have variance (not all the same)
      const uniqueDelays = new Set(delays);
      expect(uniqueDelays.size).toBeGreaterThan(1);

      // Check that all delays are within expected range (1000 ± 25%)
      delays.forEach((delay) => {
        expect(delay).toBeGreaterThanOrEqual(750);
        expect(delay).toBeLessThanOrEqual(1250);
      });
    });

    it("should return non-negative delays", () => {
      const engine = new RetryEngine({
        retryAttempts: 3,
        retryBackoffMs: 0, // Edge case: zero base delay
        retryMaxBackoffMs: 100,
      });

      const delay = (engine as any).calculateDelay(0);
      expect(delay).toBeGreaterThanOrEqual(0);
    });
  });
});
