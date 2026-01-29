import { describe, it, expect } from "vitest";
import { extractSummary } from "../../src/geo/summary-generator";

describe("extractSummary", () => {
  it("should use custom summary from GEO rule (highest priority)", () => {
    const html = "<html><head><meta name=\"description\" content=\"This is a very long meta description that should be used as fallback.\"></head><body></body></html>";
    const rule = { urlPattern: "/test", summary: "Custom rule summary text" };

    const result = extractSummary(html, rule);

    expect(result).not.toBeNull();
    expect(result!.text).toBe("Custom rule summary text");
    expect(result!.source).toBe("custom");
  });

  it("should extract meta description when no rule summary", () => {
    const html = "<html><head><meta name=\"description\" content=\"This is a sufficiently long meta description for testing.\"></head><body></body></html>";

    const result = extractSummary(html, null);

    expect(result).not.toBeNull();
    expect(result!.text).toBe("This is a sufficiently long meta description for testing.");
    expect(result!.source).toBe("meta-description");
  });

  it("should fall back to og:description when meta description is too short", () => {
    const html = "<html><head><meta name=\"description\" content=\"Short\"><meta property=\"og:description\" content=\"This is a longer og:description that meets the minimum length.\"></head><body></body></html>";

    const result = extractSummary(html, null);

    expect(result).not.toBeNull();
    expect(result!.text).toContain("og:description");
    expect(result!.source).toBe("og-description");
  });

  it("should fall back to first paragraph when no meta tags", () => {
    const html = "<html><head></head><body><p>This is a short paragraph.</p><p>This is a much longer first meaningful paragraph of text that exceeds the minimum character threshold for extraction.</p></body></html>";

    const result = extractSummary(html, null);

    expect(result).not.toBeNull();
    expect(result!.text).toContain("much longer first meaningful paragraph");
    expect(result!.source).toBe("first-paragraph");
  });

  it("should return null when no summary can be extracted", () => {
    const html = "<html><head></head><body><p>Hi</p></body></html>";

    const result = extractSummary(html, null);

    expect(result).toBeNull();
  });

  it("should prefer custom summary over meta description", () => {
    const html = "<html><head><meta name=\"description\" content=\"A very detailed meta description that is long enough.\"></head><body></body></html>";
    const rule = { urlPattern: "/page", summary: "Rule overrides meta" };

    const result = extractSummary(html, rule);

    expect(result!.text).toBe("Rule overrides meta");
    expect(result!.source).toBe("custom");
  });

  it("should skip meta description shorter than 30 chars", () => {
    const html = "<html><head><meta name=\"description\" content=\"Too short\"><meta property=\"og:description\" content=\"This og description is long enough to be used as summary.\"></head><body></body></html>";

    const result = extractSummary(html, null);

    expect(result!.source).toBe("og-description");
  });
});
