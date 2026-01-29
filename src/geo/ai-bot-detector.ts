/**
 * AI Bot Detector
 *
 * Lightweight edge-based AI bot detection from user-agent strings.
 * Hardcoded list of known AI bot UA substrings (no D1 access at SDK edge).
 * Updated with each SDK release; dashboard rules compensate for gaps.
 */

import type { AiBotDetectionResult } from "../types/geo.types";

/**
 * Known AI bot definitions with UA substring matching
 */
interface AiBotDefinition {
  /** Substring to match in User-Agent (case-insensitive) */
  pattern: string;
  /** Bot name */
  name: string;
  /** Bot category */
  category: string;
  /** Additional classification tags */
  tags: string[];
}

const AI_BOT_DEFINITIONS: AiBotDefinition[] = [
  // OpenAI
  { pattern: "GPTBot", name: "GPTBot", category: "ai-crawler", tags: ["openai", "llm-training"] },
  { pattern: "ChatGPT-User", name: "ChatGPT-User", category: "ai-agent", tags: ["openai", "conversational"] },
  { pattern: "OAI-SearchBot", name: "OAI-SearchBot", category: "ai-search", tags: ["openai", "search"] },

  // Anthropic
  { pattern: "ClaudeBot", name: "ClaudeBot", category: "ai-crawler", tags: ["anthropic", "llm-training"] },
  { pattern: "Anthropic-AI", name: "Anthropic-AI", category: "ai-crawler", tags: ["anthropic", "llm-training"] },
  { pattern: "Claude-SearchBot", name: "Claude-SearchBot", category: "ai-search", tags: ["anthropic", "search"] },

  // Google
  { pattern: "Google-Extended", name: "Google-Extended", category: "ai-crawler", tags: ["google", "llm-training"] },
  { pattern: "GoogleAgent-Mariner", name: "GoogleAgent-Mariner", category: "ai-agent", tags: ["google", "agent"] },
  { pattern: "Google-CloudVertexBot", name: "Google-CloudVertexBot", category: "ai-crawler", tags: ["google", "vertex"] },

  // Amazon
  { pattern: "Amazonbot", name: "Amazonbot", category: "ai-crawler", tags: ["amazon", "alexa"] },

  // ByteDance
  { pattern: "Bytespider", name: "Bytespider", category: "ai-crawler", tags: ["bytedance", "llm-training"] },

  // Common Crawl
  { pattern: "CCBot", name: "CCBot", category: "ai-crawler", tags: ["commoncrawl", "llm-training"] },

  // Cohere
  { pattern: "cohere-ai", name: "Cohere-AI", category: "ai-crawler", tags: ["cohere", "llm-training"] },

  // Perplexity
  { pattern: "PerplexityBot", name: "PerplexityBot", category: "ai-search", tags: ["perplexity", "search"] },

  // Meta
  { pattern: "Meta-ExternalAgent", name: "Meta-ExternalAgent", category: "ai-crawler", tags: ["meta", "llm-training"] },
  { pattern: "FacebookBot", name: "FacebookBot", category: "ai-crawler", tags: ["meta", "social"] },

  // Apple
  { pattern: "Applebot-Extended", name: "Applebot-Extended", category: "ai-crawler", tags: ["apple", "llm-training"] },

  // Microsoft
  { pattern: "Bingbot", name: "Bingbot", category: "ai-search", tags: ["microsoft", "search"] },

  // Mistral
  { pattern: "MistralBot", name: "MistralBot", category: "ai-crawler", tags: ["mistral", "llm-training"] },

  // AI search agents
  { pattern: "YouBot", name: "YouBot", category: "ai-search", tags: ["you.com", "search"] },
  { pattern: "Brave-Search", name: "Brave-Search", category: "ai-search", tags: ["brave", "search"] },
];

/**
 * Detect if a request is from an AI bot based on user-agent.
 * Uses case-insensitive substring matching for performance.
 */
export function detectAiBot(userAgent: string): AiBotDetectionResult {
  if (!userAgent) {
    return { isAiBot: false };
  }

  const uaLower = userAgent.toLowerCase();

  for (const bot of AI_BOT_DEFINITIONS) {
    if (uaLower.includes(bot.pattern.toLowerCase())) {
      return {
        isAiBot: true,
        botName: bot.name,
        botCategory: bot.category,
        botTags: bot.tags,
      };
    }
  }

  return { isAiBot: false };
}
