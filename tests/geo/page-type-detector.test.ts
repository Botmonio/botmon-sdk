import { describe, it, expect } from "vitest";
import { detectPageType, globToRegex, findMatchingRule } from "../../src/geo/page-type-detector";

describe("globToRegex", () => {
  it("should match exact paths", () => {
    const regex = globToRegex("/pricing");
    expect(regex.test("/pricing")).toBe(true);
    expect(regex.test("/pricing/basic")).toBe(false);
  });

  it("should match * (single segment)", () => {
    const regex = globToRegex("/products/*");
    expect(regex.test("/products/widget")).toBe(true);
    expect(regex.test("/products/widget/details")).toBe(false);
    expect(regex.test("/products/")).toBe(false);
  });

  it("should match ** (multi-segment)", () => {
    const regex = globToRegex("/docs/**");
    expect(regex.test("/docs/api")).toBe(true);
    expect(regex.test("/docs/api/auth")).toBe(true);
    expect(regex.test("/docs/api/auth/oauth")).toBe(true);
  });

  it("should escape special regex characters", () => {
    const regex = globToRegex("/api/v1.0/users");
    expect(regex.test("/api/v1.0/users")).toBe(true);
    expect(regex.test("/api/v1X0/users")).toBe(false);
  });
});

describe("findMatchingRule", () => {
  const rules = [
    { urlPattern: "/products/*", pageType: "product" as const },
    { urlPattern: "/docs/**", pageType: "docs" as const },
    { urlPattern: "/pricing", pageType: "pricing" as const },
  ];

  it("should match product pages", () => {
    const rule = findMatchingRule("/products/widget", rules);
    expect(rule?.pageType).toBe("product");
  });

  it("should match nested docs", () => {
    const rule = findMatchingRule("/docs/api/auth", rules);
    expect(rule?.pageType).toBe("docs");
  });

  it("should match exact pricing", () => {
    const rule = findMatchingRule("/pricing", rules);
    expect(rule?.pageType).toBe("pricing");
  });

  it("should return null for unmatched paths", () => {
    const rule = findMatchingRule("/about", rules);
    expect(rule).toBeNull();
  });
});

describe("detectPageType", () => {
  it("should use GEO rule when matched", () => {
    const rules = [{ urlPattern: "/products/*", pageType: "product" as const }];
    const result = detectPageType("/products/widget", "", rules);
    expect(result.pageType).toBe("product");
    expect(result.source).toBe("geo-rule");
    expect(result.confidence).toBe("high");
  });

  it("should detect product page from URL", () => {
    const result = detectPageType("/products/abc", "", []);
    expect(result.pageType).toBe("product");
    expect(result.source).toBe("url-pattern");
  });

  it("should detect docs page from URL", () => {
    const result = detectPageType("/docs/getting-started", "", []);
    expect(result.pageType).toBe("docs");
  });

  it("should detect article from og:type meta", () => {
    const html = "<html><head><meta property=\"og:type\" content=\"article\"></head><body></body></html>";
    const result = detectPageType("/some-post", html, []);
    expect(result.pageType).toBe("article");
    expect(result.source).toBe("meta-tag");
  });

  it("should detect FAQ from question headings", () => {
    const html = `
      <h2>What is BotMon?</h2><p>A bot management tool.</p>
      <h2>How does it work?</h2><p>It detects bots.</p>
      <h2>Is it free?</h2><p>There's a free tier.</p>
    `;
    const result = detectPageType("/help", html, []);
    expect(result.pageType).toBe("faq");
    expect(result.source).toBe("content-heuristic");
  });

  it("should detect pricing from price patterns", () => {
    const html = "<p>Starter: $49/month</p><p>Pro: $99/month</p>";
    const result = detectPageType("/plans-page", html, []);
    expect(result.pageType).toBe("pricing");
  });

  it("should fall back to generic", () => {
    const result = detectPageType("/about", "<html><body>About us</body></html>", []);
    expect(result.pageType).toBe("generic");
    expect(result.source).toBe("default");
  });
});
