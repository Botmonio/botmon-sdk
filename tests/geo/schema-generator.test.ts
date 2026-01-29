import { describe, it, expect } from "vitest";
import { generateSchema } from "../../src/geo/schema-generator";

describe("generateSchema", () => {
  const baseUrl = new URL("https://example.com/page");

  it("should generate Product schema", () => {
    const html = `
      <html><head>
        <title>Widget Pro</title>
        <meta name="description" content="The best widget">
      </head><body>
        <p>Price: $49.99</p>
      </body></html>
    `;
    const schema = generateSchema("product", html, baseUrl, null);
    expect(schema).not.toBeNull();
    expect(schema!["@type"]).toBe("Product");
    expect(schema!["@context"]).toBe("https://schema.org");
    expect(schema!.name).toBe("Widget Pro");
    expect(schema!.offers).toBeDefined();
  });

  it("should generate Article schema", () => {
    const html = `
      <html><head>
        <title>My Blog Post</title>
        <meta name="description" content="A great article">
        <meta property="article:published_time" content="2025-01-15T10:00:00Z">
      </head><body></body></html>
    `;
    const schema = generateSchema("article", html, baseUrl, null);
    expect(schema!["@type"]).toBe("Article");
    expect(schema!.headline).toBe("My Blog Post");
    expect(schema!.datePublished).toBe("2025-01-15T10:00:00Z");
  });

  it("should generate TechArticle schema for docs", () => {
    const html = "<html><head><title>API Reference</title></head><body></body></html>";
    const schema = generateSchema("docs", html, baseUrl, null);
    expect(schema!["@type"]).toBe("TechArticle");
  });

  it("should generate FAQPage schema", () => {
    const html = `
      <h2>What is this?</h2><p>A product that solves problems efficiently.</p>
      <h2>How does it work?</h2><p>It uses advanced algorithms to analyze data.</p>
    `;
    const schema = generateSchema("faq", html, baseUrl, null);
    expect(schema!["@type"]).toBe("FAQPage");
    expect(schema!.mainEntity).toBeDefined();
  });

  it("should generate HowTo schema", () => {
    const html = `
      <html><head><title>How to Set Up</title></head><body>
        <ol><li>Install the package</li><li>Configure settings</li><li>Run the app</li></ol>
      </body></html>
    `;
    const schema = generateSchema("how-to", html, baseUrl, null);
    expect(schema!["@type"]).toBe("HowTo");
    expect(schema!.step).toBeDefined();
    expect(Array.isArray(schema!.step)).toBe(true);
  });

  it("should generate WebPage schema for generic pages", () => {
    const html = "<html><head><title>About Us</title></head><body></body></html>";
    const schema = generateSchema("generic", html, baseUrl, null);
    expect(schema!["@type"]).toBe("WebPage");
  });

  it("should merge custom JSON-LD from rule", () => {
    const html = "<html><head><title>Test</title></head><body></body></html>";
    const rule = {
      urlPattern: "/test",
      customJsonLd: { brand: { "@type": "Brand", name: "BotMon" } },
    };
    const schema = generateSchema("product", html, baseUrl, rule);
    expect(schema!.brand).toBeDefined();
  });

  it("should use og:title over <title>", () => {
    const html = `
      <html><head>
        <title>Page Title</title>
        <meta property="og:title" content="OG Title">
      </head><body></body></html>
    `;
    const schema = generateSchema("generic", html, baseUrl, null);
    expect(schema!.name).toBe("OG Title");
  });
});
