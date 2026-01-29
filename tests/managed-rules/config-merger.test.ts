import { describe, it, expect } from "vitest";
import { mergeConfig } from "../../src/managed-rules/config-merger";
import type { ManagedRulesConfig, RemoteConfigBundle } from "../../src/types/managed-rules.types";

describe("mergeConfig", () => {
  it("should use SDK defaults when remote is null", () => {
    const sdk: ManagedRulesConfig = {
      robotsTxt: { enabled: true, mode: "append" },
      geo: { enabled: true, injectJsonLd: true, injectSummary: true },
    };

    const result = mergeConfig(sdk, null);
    expect(result.robotsTxt.enabled).toBe(true);
    expect(result.robotsTxt.mode).toBe("append");
    expect(result.geo.enabled).toBe(true);
  });

  it("should use defaults when nothing is configured", () => {
    const result = mergeConfig({}, null);
    expect(result.robotsTxt.enabled).toBe(false);
    expect(result.sitemap.enabled).toBe(false);
    expect(result.wellKnown.enabled).toBe(false);
    expect(result.geo.enabled).toBe(false);
  });

  it("should let dashboard override SDK robotsTxt config", () => {
    const sdk: ManagedRulesConfig = {
      robotsTxt: { enabled: true, mode: "append" },
    };
    const remote: RemoteConfigBundle = {
      robotsTxt: { enabled: true, mode: "replace", content: "User-agent: *\nDisallow: /" },
    };

    const result = mergeConfig(sdk, remote);
    expect(result.robotsTxt.mode).toBe("replace");
    expect(result.robotsTxt.content).toBe("User-agent: *\nDisallow: /");
  });

  it("should let dashboard disable SDK-enabled features", () => {
    const sdk: ManagedRulesConfig = {
      robotsTxt: { enabled: true, mode: "append" },
    };
    const remote: RemoteConfigBundle = {
      robotsTxt: { enabled: false, mode: "append" },
    };

    const result = mergeConfig(sdk, remote);
    expect(result.robotsTxt.enabled).toBe(false);
  });

  it("should merge well-known files from both sources", () => {
    const sdk: ManagedRulesConfig = {
      wellKnown: {
        enabled: true,
        files: {
          "ai-plugin.json": { mode: "replace" },
        },
      },
    };
    const remote: RemoteConfigBundle = {
      wellKnown: {
        enabled: true,
        files: {
          "ai-plugin.json": { mode: "replace", content: "{}" },
          "llms.txt": { mode: "replace", content: "LLM data" },
        },
      },
    };

    const result = mergeConfig(sdk, remote);
    expect(Object.keys(result.wellKnown.files)).toHaveLength(2);
    expect(result.wellKnown.files["ai-plugin.json"].content).toBe("{}");
    expect(result.wellKnown.files["llms.txt"].content).toBe("LLM data");
  });

  it("should merge GEO rules with dashboard overriding matching patterns", () => {
    const sdk: ManagedRulesConfig = {
      geo: {
        enabled: true,
        rules: [
          { urlPattern: "/products/*", pageType: "product" },
          { urlPattern: "/docs/**", pageType: "docs" },
        ],
      },
    };
    const remote: RemoteConfigBundle = {
      geo: {
        enabled: true,
        rules: [
          { urlPattern: "/products/*", pageType: "product", summary: "Dashboard summary" },
          { urlPattern: "/pricing", pageType: "pricing" },
        ],
      },
    };

    const result = mergeConfig(sdk, remote);
    expect(result.geo.rules).toHaveLength(3); // products (overridden), docs, pricing
    const productRule = result.geo.rules.find((r) => r.urlPattern === "/products/*");
    expect(productRule?.summary).toBe("Dashboard summary");
    expect(result.geo.rules.find((r) => r.urlPattern === "/docs/**")).toBeDefined();
    expect(result.geo.rules.find((r) => r.urlPattern === "/pricing")).toBeDefined();
  });

  it("should let dashboard override GEO boolean settings", () => {
    const sdk: ManagedRulesConfig = {
      geo: {
        enabled: true,
        injectJsonLd: true,
        injectSummary: true,
        enrichHeadings: true,
      },
    };
    const remote: RemoteConfigBundle = {
      geo: {
        enabled: true,
        injectJsonLd: false,
        enrichHeadings: false,
      },
    };

    const result = mergeConfig(sdk, remote);
    expect(result.geo.injectJsonLd).toBe(false);
    expect(result.geo.injectSummary).toBe(true); // Not overridden
    expect(result.geo.enrichHeadings).toBe(false);
  });
});
