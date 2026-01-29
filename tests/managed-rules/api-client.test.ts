import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fetchConfig } from "../../src/managed-rules/api-client";

describe("fetchConfig", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    // Reset fetch mock before each test
    globalThis.fetch = vi.fn();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("should fetch config from API and return parsed bundle", async () => {
    const mockBundle = {
      robotsTxt: { enabled: true, mode: "append", content: "User-agent: GPTBot\nDisallow: /" },
    };
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response(JSON.stringify(mockBundle), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const result = await fetchConfig("example.com", "test-key", "https://api.botmon.io", 300);

    expect(result).toEqual(mockBundle);
    expect(globalThis.fetch).toHaveBeenCalledWith(
      "https://api.botmon.io/v1/sdk-config/example.com",
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({
          "X-API-Key": "test-key",
        }),
      }),
    );
  });

  it("should return null for 404 (no config for hostname)", async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response("Not Found", { status: 404 }),
    );

    const result = await fetchConfig("unknown.com", "test-key", "https://api.botmon.io", 300);

    expect(result).toBeNull();
  });

  it("should return null for API errors (500)", async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response("Internal Server Error", { status: 500 }),
    );

    const result = await fetchConfig("example.com", "test-key", "https://api.botmon.io", 300);

    expect(result).toBeNull();
  });

  it("should return null on network error", async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("Network failure"),
    );

    const result = await fetchConfig("example.com", "test-key", "https://api.botmon.io", 300);

    expect(result).toBeNull();
  });

  it("should encode hostname in URL", async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response("null", { status: 404 }),
    );

    await fetchConfig("my site.com", "test-key", "https://api.botmon.io", 300);

    expect(globalThis.fetch).toHaveBeenCalledWith(
      "https://api.botmon.io/v1/sdk-config/my%20site.com",
      expect.anything(),
    );
  });

  it("should return full config bundle with all sections", async () => {
    const fullBundle = {
      robotsTxt: { enabled: true, mode: "append", content: "block bots" },
      sitemap: { enabled: false },
      wellKnown: {
        enabled: true,
        files: {
          "llms.txt": { mode: "replace", content: "LLM data" },
        },
      },
      geo: {
        enabled: true,
        injectJsonLd: true,
        rules: [{ urlPattern: "/products/*", pageType: "product" }],
      },
    };
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response(JSON.stringify(fullBundle), { status: 200 }),
    );

    const result = await fetchConfig("example.com", "key", "https://api.botmon.io", 300);

    expect(result).toEqual(fullBundle);
    expect(result?.robotsTxt?.content).toBe("block bots");
    expect(result?.wellKnown?.files["llms.txt"].content).toBe("LLM data");
  });
});
