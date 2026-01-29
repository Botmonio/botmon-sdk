import { describe, it, expect, vi, beforeEach } from "vitest";
import { createCloudflareMiddleware } from "../../src/middleware/cloudflare";

// Mock dependencies
vi.mock("../../src/managed-rules/api-client", () => ({
  fetchConfig: vi.fn().mockResolvedValue(null),
}));

vi.mock("../../src/client/botmon", () => ({
  BotMon: {
    init: vi.fn().mockReturnValue({
      track: vi.fn(),
    }),
  },
}));

const mockCtx = {
  waitUntil: vi.fn(),
  passThroughOnException: vi.fn(),
} as unknown as ExecutionContext;

describe("createCloudflareMiddleware", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should wrap a fetch handler and return a Worker export", () => {
    const handler = vi.fn().mockResolvedValue(new Response("OK"));
    const middleware = createCloudflareMiddleware({ apiKey: "test-key" });
    const worker = middleware(handler);

    expect(worker).toHaveProperty("fetch");
    expect(typeof worker.fetch).toBe("function");
  });

  it("should call the origin handler", async () => {
    const originResponse = new Response("Hello World", { status: 200 });
    const handler = vi.fn().mockResolvedValue(originResponse);

    const worker = createCloudflareMiddleware({
      apiKey: "test-key",
    })(handler);

    const request = new Request("https://example.com/page");
    const response = await worker.fetch(request, {}, mockCtx);

    expect(handler).toHaveBeenCalled();
    expect(response).toBeDefined();
  });

  it("should pass through to origin when no API key", async () => {
    const originResponse = new Response("Origin", { status: 200 });
    const handler = vi.fn().mockResolvedValue(originResponse);

    const worker = createCloudflareMiddleware({})(handler);
    const request = new Request("https://example.com/page");
    const response = await worker.fetch(request, {}, mockCtx);

    expect(handler).toHaveBeenCalledWith(request, {}, mockCtx);
    expect(response).toBe(originResponse);
  });

  it("should gracefully degrade on error", async () => {
    const originResponse = new Response("Fallback");
    const handler = vi.fn().mockResolvedValue(originResponse);

    // Create middleware with invalid config that will trigger errors
    const worker = createCloudflareMiddleware({
      apiKey: "test-key",
      debug: true,
    })(handler);

    const request = new Request("https://example.com/");
    const response = await worker.fetch(request, {}, mockCtx);

    // Should return a response (either pipeline result or fallback)
    expect(response).toBeDefined();
    const text = await response.text();
    expect(text).toBeTruthy();
  });

  it("should call onResponse hook", async () => {
    const modifiedResponse = new Response("Modified", { status: 200 });
    const onResponse = vi.fn().mockReturnValue(modifiedResponse);
    const handler = vi.fn().mockResolvedValue(new Response("Original"));

    const worker = createCloudflareMiddleware({
      apiKey: "test-key",
      onResponse,
    })(handler);

    const request = new Request("https://example.com/page");
    await worker.fetch(request, {}, mockCtx);

    expect(onResponse).toHaveBeenCalled();
  });
});
