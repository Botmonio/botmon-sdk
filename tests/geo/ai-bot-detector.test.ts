import { describe, it, expect } from "vitest";
import { detectAiBot } from "../../src/geo/ai-bot-detector";

describe("detectAiBot", () => {
  it("should detect GPTBot", () => {
    const result = detectAiBot("Mozilla/5.0 GPTBot/1.0");
    expect(result.isAiBot).toBe(true);
    expect(result.botName).toBe("GPTBot");
    expect(result.botCategory).toBe("ai-crawler");
    expect(result.botTags).toContain("openai");
  });

  it("should detect ClaudeBot", () => {
    const result = detectAiBot("ClaudeBot/1.0");
    expect(result.isAiBot).toBe(true);
    expect(result.botName).toBe("ClaudeBot");
    expect(result.botTags).toContain("anthropic");
  });

  it("should detect ChatGPT-User", () => {
    const result = detectAiBot("Mozilla/5.0 ChatGPT-User/1.0");
    expect(result.isAiBot).toBe(true);
    expect(result.botName).toBe("ChatGPT-User");
    expect(result.botCategory).toBe("ai-agent");
  });

  it("should detect PerplexityBot", () => {
    const result = detectAiBot("PerplexityBot/1.0");
    expect(result.isAiBot).toBe(true);
    expect(result.botName).toBe("PerplexityBot");
    expect(result.botCategory).toBe("ai-search");
  });

  it("should detect Google-Extended", () => {
    const result = detectAiBot("Mozilla/5.0 Google-Extended");
    expect(result.isAiBot).toBe(true);
    expect(result.botName).toBe("Google-Extended");
  });

  it("should detect Bytespider", () => {
    const result = detectAiBot("Bytespider/1.0");
    expect(result.isAiBot).toBe(true);
    expect(result.botName).toBe("Bytespider");
  });

  it("should detect case-insensitively", () => {
    const result = detectAiBot("mozilla/5.0 gptbot/1.0");
    expect(result.isAiBot).toBe(true);
    expect(result.botName).toBe("GPTBot");
  });

  it("should not flag regular Chrome browser", () => {
    const result = detectAiBot(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0",
    );
    expect(result.isAiBot).toBe(false);
    expect(result.botName).toBeUndefined();
  });

  it("should not flag Googlebot (search bot, not AI bot)", () => {
    const result = detectAiBot("Mozilla/5.0 (compatible; Googlebot/2.1)");
    expect(result.isAiBot).toBe(false);
  });

  it("should not flag empty user agent", () => {
    const result = detectAiBot("");
    expect(result.isAiBot).toBe(false);
  });
});
