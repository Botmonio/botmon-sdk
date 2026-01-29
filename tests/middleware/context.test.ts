import { describe, it, expect } from "vitest";
import { buildContext } from "../../src/middleware/context";

// Mock ExecutionContext
const mockCtx = {
  waitUntil: () => { /* noop */ },
  passThroughOnException: () => { /* noop */ },
} as unknown as ExecutionContext;

describe("buildContext", () => {
  it("should build context from request and response", () => {
    const request = new Request("https://example.com/page", {
      headers: { "User-Agent": "Mozilla/5.0 Chrome/120" },
    });
    const response = new Response("OK", { status: 200 });

    const context = buildContext(request, response, {}, mockCtx);

    expect(context.url.pathname).toBe("/page");
    expect(context.url.hostname).toBe("example.com");
    expect(context.isAiBot).toBe(false);
    expect(context.trafficType).toBe("human");
    expect(context.request).toBe(request);
    expect(context.response).toBe(response);
  });

  it("should detect AI bot from user-agent", () => {
    const request = new Request("https://example.com/", {
      headers: { "User-Agent": "GPTBot/1.0" },
    });
    const response = new Response("OK");

    const context = buildContext(request, response, {}, mockCtx);

    expect(context.isAiBot).toBe(true);
    expect(context.botName).toBe("GPTBot");
    expect(context.trafficType).toBe("good_bot");
  });

  it("should extract country from cf object", () => {
    const request = new Request("https://example.com/");
    (request as any).cf = { country: "US" };
    const response = new Response("OK");

    const context = buildContext(request, response, {}, mockCtx);
    expect(context.country).toBe("US");
  });

  it("should handle missing cf object", () => {
    const request = new Request("https://example.com/");
    const response = new Response("OK");

    const context = buildContext(request, response, {}, mockCtx);
    expect(context.country).toBeUndefined();
  });
});
