import { describe, it, expect, vi, beforeEach } from "vitest";
import { createCloudflareMiddleware } from "../../src/middleware/cloudflare";
import { BotMon } from "../../src/client/botmon";

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

function getMockTrack() {
  return (BotMon.init as any)().track;
}

describe("Session Cookie Tracking", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should set __botmon_sid cookie on response when no cookie present", async () => {
    const handler = vi.fn().mockResolvedValue(new Response("OK"));
    const worker = createCloudflareMiddleware({ apiKey: "test-key" })(handler);

    const request = new Request("https://example.com/page");
    const response = await worker.fetch(request, {}, mockCtx);

    const setCookie = response.headers.get("Set-Cookie");
    expect(setCookie).toBeTruthy();
    expect(setCookie).toContain("__botmon_sid=");
    expect(setCookie).toContain("Path=/");
    expect(setCookie).toContain("Max-Age=1800");
    expect(setCookie).toContain("HttpOnly");
    expect(setCookie).toContain("Secure");
    expect(setCookie).toContain("SameSite=Lax");
  });

  it("should preserve existing session cookie value", async () => {
    const existingSessionId = "550e8400-e29b-41d4-a716-446655440000";
    const handler = vi.fn().mockResolvedValue(new Response("OK"));
    const worker = createCloudflareMiddleware({ apiKey: "test-key" })(handler);

    const request = new Request("https://example.com/page", {
      headers: { Cookie: `__botmon_sid=${existingSessionId}` },
    });
    const response = await worker.fetch(request, {}, mockCtx);

    const setCookie = response.headers.get("Set-Cookie");
    expect(setCookie).toContain(`__botmon_sid=${existingSessionId}`);
  });

  it("should pass sessionId to track call", async () => {
    const handler = vi.fn().mockResolvedValue(new Response("OK"));
    const worker = createCloudflareMiddleware({ apiKey: "test-key" })(handler);

    const request = new Request("https://example.com/page");
    await worker.fetch(request, {}, mockCtx);

    const mockTrack = getMockTrack();
    expect(mockTrack).toHaveBeenCalledWith(
      mockCtx,
      expect.objectContaining({
        sessionId: expect.any(String),
      }),
    );
  });

  it("should not set cookie when session tracking is disabled", async () => {
    const handler = vi.fn().mockResolvedValue(new Response("OK"));
    const worker = createCloudflareMiddleware({
      apiKey: "test-key",
      sessionTracking: { enabled: false },
    })(handler);

    const request = new Request("https://example.com/page");
    const response = await worker.fetch(request, {}, mockCtx);

    const setCookie = response.headers.get("Set-Cookie");
    expect(setCookie).toBeNull();
  });

  it("should not pass sessionId when session tracking is disabled", async () => {
    const handler = vi.fn().mockResolvedValue(new Response("OK"));
    const worker = createCloudflareMiddleware({
      apiKey: "test-key",
      sessionTracking: { enabled: false },
    })(handler);

    const request = new Request("https://example.com/page");
    await worker.fetch(request, {}, mockCtx);

    const mockTrack = getMockTrack();
    expect(mockTrack).toHaveBeenCalledWith(
      mockCtx,
      expect.objectContaining({
        sessionId: undefined,
      }),
    );
  });

  it("should use custom cookie name", async () => {
    const handler = vi.fn().mockResolvedValue(new Response("OK"));
    const worker = createCloudflareMiddleware({
      apiKey: "test-key",
      sessionTracking: { cookieName: "_my_session" },
    })(handler);

    const request = new Request("https://example.com/page");
    const response = await worker.fetch(request, {}, mockCtx);

    const setCookie = response.headers.get("Set-Cookie");
    expect(setCookie).toContain("_my_session=");
  });

  it("should use custom max age", async () => {
    const handler = vi.fn().mockResolvedValue(new Response("OK"));
    const worker = createCloudflareMiddleware({
      apiKey: "test-key",
      sessionTracking: { maxAge: 3600 },
    })(handler);

    const request = new Request("https://example.com/page");
    const response = await worker.fetch(request, {}, mockCtx);

    const setCookie = response.headers.get("Set-Cookie");
    expect(setCookie).toContain("Max-Age=3600");
  });

  it("should parse cookie from multiple cookies in header", async () => {
    const existingSessionId = "550e8400-e29b-41d4-a716-446655440000";
    const handler = vi.fn().mockResolvedValue(new Response("OK"));
    const worker = createCloudflareMiddleware({ apiKey: "test-key" })(handler);

    const request = new Request("https://example.com/page", {
      headers: { Cookie: `other=value; __botmon_sid=${existingSessionId}; another=test` },
    });
    const response = await worker.fetch(request, {}, mockCtx);

    const setCookie = response.headers.get("Set-Cookie");
    expect(setCookie).toContain(`__botmon_sid=${existingSessionId}`);
  });

  it("should generate new UUID when cookie header exists but session cookie is missing", async () => {
    const handler = vi.fn().mockResolvedValue(new Response("OK"));
    const worker = createCloudflareMiddleware({ apiKey: "test-key" })(handler);

    const request = new Request("https://example.com/page", {
      headers: { Cookie: "other=value; another=test" },
    });
    const response = await worker.fetch(request, {}, mockCtx);

    const setCookie = response.headers.get("Set-Cookie");
    expect(setCookie).toBeTruthy();
    expect(setCookie).toContain("__botmon_sid=");
    const match = setCookie!.match(/__botmon_sid=([^;]+)/);
    expect(match![1]).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  });
});
