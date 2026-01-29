import { describe, it, expect, vi } from "vitest";
import { handleRobotsTxt } from "../../src/managed-rules/robots-txt";
import type { ResponseContext } from "../../src/types/middleware.types";
import type { ResolvedConfig } from "../../src/types/managed-rules.types";

const mockCtx = {
  waitUntil: () => { /* noop */ },
  passThroughOnException: () => { /* noop */ },
} as unknown as ExecutionContext;

function makeContext(): ResponseContext {
  const url = new URL("https://example.com/robots.txt");
  return {
    request: new Request(url.href),
    response: new Response("origin robots.txt"),
    trafficType: "human",
    url,
    isAiBot: false,
    env: {},
    ctx: mockCtx,
  };
}

describe("handleRobotsTxt", () => {
  describe("replace mode", () => {
    it("should serve BotMon content entirely", async () => {
      const config: ResolvedConfig["robotsTxt"] = {
        enabled: true,
        mode: "replace",
        content: "User-agent: *\nDisallow: /",
      };
      const fetchOrigin = vi.fn();

      const response = await handleRobotsTxt(makeContext(), config, fetchOrigin);
      const body = await response.text();

      expect(body).toBe("User-agent: *\nDisallow: /");
      expect(response.headers.get("X-BotMon-Mode")).toBe("replace");
      expect(fetchOrigin).not.toHaveBeenCalled();
    });

    it("should return empty body when no content configured", async () => {
      const config: ResolvedConfig["robotsTxt"] = {
        enabled: true,
        mode: "replace",
      };
      const fetchOrigin = vi.fn();

      const response = await handleRobotsTxt(makeContext(), config, fetchOrigin);
      const body = await response.text();

      expect(body).toBe("");
    });
  });

  describe("append mode", () => {
    it("should fetch origin and append BotMon content", async () => {
      const config: ResolvedConfig["robotsTxt"] = {
        enabled: true,
        mode: "append",
        content: "User-agent: GPTBot\nDisallow: /",
      };
      const fetchOrigin = vi.fn().mockResolvedValue(
        new Response("User-agent: *\nAllow: /"),
      );

      const response = await handleRobotsTxt(makeContext(), config, fetchOrigin);
      const body = await response.text();

      expect(body).toContain("User-agent: *");
      expect(body).toContain("# === BotMon Managed Rules ===");
      expect(body).toContain("User-agent: GPTBot");
      expect(response.headers.get("X-BotMon-Mode")).toBe("append");
      expect(fetchOrigin).toHaveBeenCalledOnce();
    });
  });

  describe("merge mode", () => {
    it("should fetch origin and merge User-agent blocks", async () => {
      const config: ResolvedConfig["robotsTxt"] = {
        enabled: true,
        mode: "merge",
        content: "User-agent: GPTBot\nDisallow: /\n\nUser-agent: *\nDisallow: /private",
      };
      const fetchOrigin = vi.fn().mockResolvedValue(
        new Response("User-agent: *\nAllow: /\n\nUser-agent: Googlebot\nAllow: /"),
      );

      const response = await handleRobotsTxt(makeContext(), config, fetchOrigin);
      const body = await response.text();

      // BotMon overrides * rules, keeps Googlebot from origin, adds GPTBot
      expect(body).toContain("User-agent: *");
      expect(body).toContain("Disallow: /private"); // BotMon override
      expect(body).toContain("User-agent: Googlebot");
      expect(body).toContain("User-agent: GPTBot");
      expect(response.headers.get("X-BotMon-Mode")).toBe("merge");
    });
  });

  describe("disabled mode", () => {
    it("should return the origin response unchanged", async () => {
      const context = makeContext();
      const config: ResolvedConfig["robotsTxt"] = {
        enabled: true,
        mode: "disabled",
      };
      const fetchOrigin = vi.fn();

      const response = await handleRobotsTxt(context, config, fetchOrigin);

      expect(response).toBe(context.response);
      expect(fetchOrigin).not.toHaveBeenCalled();
    });
  });
});
