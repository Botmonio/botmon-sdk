import { describe, it, expect } from "vitest";
import {
  parseRobotsTxt,
  mergeRobotsTxt,
  appendRobotsTxt,
  mergeSitemapXml,
  extractSitemapUrls,
} from "../../src/managed-rules/merge-utils";

describe("parseRobotsTxt", () => {
  it("should parse user-agent blocks", () => {
    const content = `
User-agent: *
Disallow: /admin

User-agent: GPTBot
Disallow: /
    `;
    const blocks = parseRobotsTxt(content);
    expect(blocks).toHaveLength(2);
    expect(blocks[0].userAgent).toBe("*");
    expect(blocks[0].rules).toContain("Disallow: /admin");
    expect(blocks[1].userAgent).toBe("GPTBot");
    expect(blocks[1].rules).toContain("Disallow: /");
  });

  it("should skip comments and empty lines", () => {
    const content = `
# Comment line
User-agent: Googlebot
Allow: /
    `;
    const blocks = parseRobotsTxt(content);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].userAgent).toBe("Googlebot");
  });
});

describe("mergeRobotsTxt", () => {
  it("should override origin rules with BotMon rules for same agent", () => {
    const origin = "User-agent: GPTBot\nAllow: /";
    const botmon = "User-agent: GPTBot\nDisallow: /";
    const merged = mergeRobotsTxt(origin, botmon);
    expect(merged).toContain("User-agent: GPTBot");
    expect(merged).toContain("Disallow: /");
    expect(merged).not.toContain("Allow: /");
  });

  it("should keep origin agents not in BotMon", () => {
    const origin = "User-agent: *\nDisallow: /admin";
    const botmon = "User-agent: GPTBot\nDisallow: /";
    const merged = mergeRobotsTxt(origin, botmon);
    expect(merged).toContain("User-agent: *");
    expect(merged).toContain("User-agent: GPTBot");
  });

  it("should add BotMon-only agents", () => {
    const origin = "User-agent: *\nAllow: /";
    const botmon = "User-agent: ClaudeBot\nDisallow: /private";
    const merged = mergeRobotsTxt(origin, botmon);
    expect(merged).toContain("User-agent: ClaudeBot");
  });
});

describe("appendRobotsTxt", () => {
  it("should append with separator", () => {
    const result = appendRobotsTxt(
      "User-agent: *\nAllow: /",
      "User-agent: GPTBot\nDisallow: /",
    );
    expect(result).toContain("# === BotMon Managed Rules ===");
    expect(result).toContain("User-agent: GPTBot");
  });

  it("should return origin when BotMon content is empty", () => {
    const result = appendRobotsTxt("User-agent: *\nAllow: /", "");
    expect(result).toBe("User-agent: *\nAllow: /");
  });
});

describe("extractSitemapUrls", () => {
  it("should extract URLs from sitemap XML", () => {
    const xml = `
      <urlset>
        <url><loc>https://example.com/</loc></url>
        <url><loc>https://example.com/about</loc></url>
      </urlset>
    `;
    const urls = extractSitemapUrls(xml);
    expect(urls).toHaveLength(2);
    expect(urls).toContain("https://example.com/");
    expect(urls).toContain("https://example.com/about");
  });
});

describe("mergeSitemapXml", () => {
  it("should merge and deduplicate URLs", () => {
    const origin = "<urlset><url><loc>https://example.com/</loc></url><url><loc>https://example.com/about</loc></url></urlset>";
    const botmon = "<urlset><url><loc>https://example.com/about</loc></url><url><loc>https://example.com/new</loc></url></urlset>";

    const merged = mergeSitemapXml(origin, botmon);
    expect(merged).toContain("https://example.com/");
    expect(merged).toContain("https://example.com/about");
    expect(merged).toContain("https://example.com/new");

    // Should deduplicate /about
    const aboutCount = (merged.match(/example\.com\/about/g) || []).length;
    expect(aboutCount).toBe(1);
  });

  it("should output valid XML structure", () => {
    const merged = mergeSitemapXml(
      "<urlset><url><loc>https://example.com/</loc></url></urlset>",
      "<urlset></urlset>",
    );
    expect(merged).toContain('<?xml version="1.0"');
    expect(merged).toContain("<urlset");
    expect(merged).toContain("</urlset>");
  });
});
