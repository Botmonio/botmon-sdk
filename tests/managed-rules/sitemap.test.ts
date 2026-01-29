import { describe, it, expect, vi } from "vitest";
import { handleSitemap } from "../../src/managed-rules/sitemap";
import type { ResponseContext } from "../../src/types/middleware.types";
import type { ResolvedConfig } from "../../src/types/managed-rules.types";

const mockCtx = {
  waitUntil: () => { /* noop */ },
  passThroughOnException: () => { /* noop */ },
} as unknown as ExecutionContext;

function makeContext(): ResponseContext {
  const url = new URL("https://example.com/sitemap.xml");
  return {
    request: new Request(url.href),
    response: new Response("origin sitemap"),
    trafficType: "human",
    url,
    isAiBot: false,
    env: {},
    ctx: mockCtx,
  };
}

describe("handleSitemap", () => {
  describe("replace mode", () => {
    it("should serve BotMon sitemap entirely", async () => {
      const config: ResolvedConfig["sitemap"] = {
        enabled: true,
        mode: "replace",
        content: "<urlset><url><loc>https://example.com/managed</loc></url></urlset>",
      };
      const fetchOrigin = vi.fn();

      const response = await handleSitemap(makeContext(), config, fetchOrigin);
      const body = await response.text();

      expect(body).toContain("https://example.com/managed");
      expect(response.headers.get("X-BotMon-Mode")).toBe("replace");
      expect(response.headers.get("Content-Type")).toContain("application/xml");
      expect(fetchOrigin).not.toHaveBeenCalled();
    });
  });

  describe("merge mode", () => {
    it("should merge origin and BotMon URLs with deduplication", async () => {
      const config: ResolvedConfig["sitemap"] = {
        enabled: true,
        mode: "merge",
        content: "<urlset><url><loc>https://example.com/about</loc></url><url><loc>https://example.com/new</loc></url></urlset>",
      };
      const fetchOrigin = vi.fn().mockResolvedValue(
        new Response("<urlset><url><loc>https://example.com/</loc></url><url><loc>https://example.com/about</loc></url></urlset>"),
      );

      const response = await handleSitemap(makeContext(), config, fetchOrigin);
      const body = await response.text();

      expect(body).toContain("https://example.com/");
      expect(body).toContain("https://example.com/about");
      expect(body).toContain("https://example.com/new");
      // Deduplicated
      const aboutCount = (body.match(/example\.com\/about/g) || []).length;
      expect(aboutCount).toBe(1);
      expect(response.headers.get("X-BotMon-Mode")).toBe("merge");
    });
  });

  describe("append mode", () => {
    it("should treat append as merge for sitemaps (XML needs structure)", async () => {
      const config: ResolvedConfig["sitemap"] = {
        enabled: true,
        mode: "append",
        content: "<urlset><url><loc>https://example.com/extra</loc></url></urlset>",
      };
      const fetchOrigin = vi.fn().mockResolvedValue(
        new Response("<urlset><url><loc>https://example.com/</loc></url></urlset>"),
      );

      const response = await handleSitemap(makeContext(), config, fetchOrigin);
      const body = await response.text();

      expect(body).toContain("https://example.com/");
      expect(body).toContain("https://example.com/extra");
      expect(response.headers.get("X-BotMon-Mode")).toBe("merge");
    });
  });

  describe("disabled mode", () => {
    it("should return origin response unchanged", async () => {
      const context = makeContext();
      const config: ResolvedConfig["sitemap"] = {
        enabled: true,
        mode: "disabled",
      };
      const fetchOrigin = vi.fn();

      const response = await handleSitemap(context, config, fetchOrigin);

      expect(response).toBe(context.response);
      expect(fetchOrigin).not.toHaveBeenCalled();
    });
  });
});
