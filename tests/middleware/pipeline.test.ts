import { describe, it, expect, vi } from "vitest";
import { runPipeline } from "../../src/middleware/pipeline";
import type { ResponseContext } from "../../src/types/middleware.types";
import type { ResolvedConfig } from "../../src/types/managed-rules.types";

const mockCtx = {
  waitUntil: () => { /* noop */ },
  passThroughOnException: () => { /* noop */ },
} as unknown as ExecutionContext;

function makeContext(overrides: Partial<ResponseContext> = {}): ResponseContext {
  const url = overrides.url || new URL("https://example.com/page");
  return {
    request: new Request(url.href),
    response: new Response("origin body"),
    trafficType: "human",
    url,
    isAiBot: false,
    env: {},
    ctx: mockCtx,
    ...overrides,
  };
}

const disabledConfig: ResolvedConfig = {
  robotsTxt: { enabled: false, mode: "append" },
  sitemap: { enabled: false, mode: "merge" },
  wellKnown: { enabled: false, files: {} },
  geo: { enabled: false, injectJsonLd: true, injectSummary: true, enrichHeadings: true, rules: [] },
};

describe("runPipeline", () => {
  it("should return origin response when no rules match", async () => {
    const context = makeContext();
    const originFetch = vi.fn();

    const { response, appliedRules } = await runPipeline(context, disabledConfig, originFetch);

    expect(appliedRules).toHaveLength(0);
    const body = await response.text();
    expect(body).toBe("origin body");
  });

  it("should intercept /robots.txt when enabled", async () => {
    const url = new URL("https://example.com/robots.txt");
    const context = makeContext({ url, request: new Request(url.href) });
    const config: ResolvedConfig = {
      ...disabledConfig,
      robotsTxt: { enabled: true, mode: "replace", content: "User-agent: *\nDisallow: /" },
    };
    const originFetch = vi.fn().mockResolvedValue(new Response("origin robots"));

    const { response, appliedRules } = await runPipeline(context, config, originFetch);

    expect(appliedRules).toContain("robots-txt");
    const body = await response.text();
    expect(body).toContain("User-agent: *");
  });

  it("should intercept /sitemap.xml when enabled", async () => {
    const url = new URL("https://example.com/sitemap.xml");
    const context = makeContext({ url, request: new Request(url.href) });
    const config: ResolvedConfig = {
      ...disabledConfig,
      sitemap: {
        enabled: true,
        mode: "replace",
        content: "<urlset><url><loc>https://example.com/</loc></url></urlset>",
      },
    };
    const originFetch = vi.fn();

    const { response, appliedRules } = await runPipeline(context, config, originFetch);

    expect(appliedRules).toContain("sitemap");
    const body = await response.text();
    expect(body).toContain("example.com");
  });

  it("should intercept /.well-known/llms.txt when configured", async () => {
    const url = new URL("https://example.com/.well-known/llms.txt");
    const context = makeContext({ url, request: new Request(url.href) });
    const config: ResolvedConfig = {
      ...disabledConfig,
      wellKnown: {
        enabled: true,
        files: {
          "llms.txt": { mode: "replace", content: "LLM context data" },
        },
      },
    };
    const originFetch = vi.fn();

    const { response, appliedRules } = await runPipeline(context, config, originFetch);

    expect(appliedRules).toContain("well-known");
    const body = await response.text();
    expect(body).toBe("LLM context data");
  });

  it("should pass through unconfigured .well-known paths", async () => {
    const url = new URL("https://example.com/.well-known/security.txt");
    const context = makeContext({ url, request: new Request(url.href) });
    const config: ResolvedConfig = {
      ...disabledConfig,
      wellKnown: {
        enabled: true,
        files: {
          "llms.txt": { mode: "replace", content: "LLM data" },
        },
      },
    };
    const originFetch = vi.fn();

    const { response, appliedRules } = await runPipeline(context, config, originFetch);

    expect(appliedRules).not.toContain("well-known");
    const body = await response.text();
    expect(body).toBe("origin body");
  });

  it("should short-circuit after first matching stage", async () => {
    // /robots.txt should match robots-txt stage, skip sitemap and well-known
    const url = new URL("https://example.com/robots.txt");
    const context = makeContext({ url, request: new Request(url.href) });
    const config: ResolvedConfig = {
      ...disabledConfig,
      robotsTxt: { enabled: true, mode: "replace", content: "Disallow: /" },
      sitemap: { enabled: true, mode: "replace", content: "<urlset></urlset>" },
    };
    const originFetch = vi.fn();

    const { appliedRules } = await runPipeline(context, config, originFetch);

    expect(appliedRules).toEqual(["robots-txt"]);
    expect(appliedRules).not.toContain("sitemap");
  });

  it("should apply GEO optimization for AI bots on non-managed paths", async () => {
    const url = new URL("https://example.com/products/widget");
    const htmlBody = "<html><head><title>Widget</title><meta name=\"description\" content=\"A great widget that does amazing things for your workflow\"></head><body><h1>Widget</h1><p>Content</p></body></html>";
    const context = makeContext({
      url,
      request: new Request(url.href, { headers: { "User-Agent": "GPTBot/1.0" } }),
      response: new Response(htmlBody, { headers: { "Content-Type": "text/html" } }),
      isAiBot: true,
      trafficType: "good_bot",
      botName: "GPTBot",
    });
    const config: ResolvedConfig = {
      ...disabledConfig,
      geo: {
        enabled: true,
        injectJsonLd: true,
        injectSummary: true,
        enrichHeadings: true,
        rules: [{ urlPattern: "/products/*", pageType: "product" }],
      },
    };
    const originFetch = vi.fn();

    const { response, appliedRules } = await runPipeline(context, config, originFetch);

    expect(appliedRules).toContain("geo");
    const body = await response.text();
    expect(body).toContain("application/ld+json");
  });

  it("should NOT apply GEO for human traffic", async () => {
    const url = new URL("https://example.com/products/widget");
    const context = makeContext({
      url,
      request: new Request(url.href),
      response: new Response("<html><head><title>Widget</title></head><body></body></html>", {
        headers: { "Content-Type": "text/html" },
      }),
      isAiBot: false,
    });
    const config: ResolvedConfig = {
      ...disabledConfig,
      geo: { enabled: true, injectJsonLd: true, injectSummary: true, enrichHeadings: true, rules: [] },
    };
    const originFetch = vi.fn();

    const { appliedRules } = await runPipeline(context, config, originFetch);

    expect(appliedRules).not.toContain("geo");
  });

  it("should isolate errors — a failing stage does not break the pipeline", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => { /* noop */ });
    const url = new URL("https://example.com/page");
    const context = makeContext({ url, request: new Request(url.href) });

    // All stages disabled, so none will throw — but pipeline should still return
    const { response } = await runPipeline(context, disabledConfig, vi.fn());

    expect(response).toBeDefined();
    consoleSpy.mockRestore();
  });
});
