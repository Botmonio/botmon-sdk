/**
 * Merge Utilities
 *
 * Utilities for merging robots.txt and sitemap content intelligently.
 */

/**
 * Parsed robots.txt block (one User-agent + its rules)
 */
interface RobotsBlock {
  userAgent: string;
  rules: string[];
}

/**
 * Parse robots.txt into structured blocks
 */
export function parseRobotsTxt(content: string): RobotsBlock[] {
  const blocks: RobotsBlock[] = [];
  let currentAgent: string | null = null;
  let currentRules: string[] = [];

  for (const rawLine of content.split("\n")) {
    const line = rawLine.trim();

    // Skip empty lines and comments
    if (!line || line.startsWith("#")) continue;

    const lowerLine = line.toLowerCase();
    if (lowerLine.startsWith("user-agent:")) {
      // Save previous block
      if (currentAgent !== null) {
        blocks.push({ userAgent: currentAgent, rules: currentRules });
      }
      currentAgent = line.substring("user-agent:".length).trim();
      currentRules = [];
    } else if (currentAgent !== null) {
      currentRules.push(line);
    }
  }

  // Save last block
  if (currentAgent !== null) {
    blocks.push({ userAgent: currentAgent, rules: currentRules });
  }

  return blocks;
}

/**
 * Merge two robots.txt files.
 * BotMon rules override origin rules for the same User-agent.
 */
export function mergeRobotsTxt(originContent: string, botmonContent: string): string {
  const originBlocks = parseRobotsTxt(originContent);
  const botmonBlocks = parseRobotsTxt(botmonContent);

  // Index BotMon blocks by user-agent (case-insensitive)
  const botmonByAgent = new Map<string, RobotsBlock>();
  for (const block of botmonBlocks) {
    botmonByAgent.set(block.userAgent.toLowerCase(), block);
  }

  // Build merged output: origin blocks (with BotMon overrides), then BotMon-only blocks
  const usedAgents = new Set<string>();
  const mergedBlocks: RobotsBlock[] = [];

  for (const originBlock of originBlocks) {
    const agentKey = originBlock.userAgent.toLowerCase();
    const override = botmonByAgent.get(agentKey);
    if (override) {
      mergedBlocks.push(override);
      usedAgents.add(agentKey);
    } else {
      mergedBlocks.push(originBlock);
    }
  }

  // Add BotMon-only agents
  for (const botmonBlock of botmonBlocks) {
    if (!usedAgents.has(botmonBlock.userAgent.toLowerCase())) {
      mergedBlocks.push(botmonBlock);
    }
  }

  return blocksToString(mergedBlocks);
}

/**
 * Append BotMon content to origin robots.txt with a separator
 */
export function appendRobotsTxt(originContent: string, botmonContent: string): string {
  const trimmedOrigin = originContent.trimEnd();
  const trimmedBotmon = botmonContent.trim();

  if (!trimmedBotmon) return trimmedOrigin;

  return `${trimmedOrigin}\n\n# === BotMon Managed Rules ===\n${trimmedBotmon}\n`;
}

/**
 * Convert robots blocks back to string
 */
function blocksToString(blocks: RobotsBlock[]): string {
  return blocks
    .map((block) => {
      const lines = [`User-agent: ${block.userAgent}`, ...block.rules];
      return lines.join("\n");
    })
    .join("\n\n");
}

/**
 * Extract <url><loc>...</loc></url> entries from sitemap XML
 */
export function extractSitemapUrls(xml: string): string[] {
  const urls: string[] = [];
  const locRegex = /<loc>\s*(.*?)\s*<\/loc>/gi;
  let match: RegExpExecArray | null;
  while ((match = locRegex.exec(xml)) !== null) {
    if (match[1]) {
      urls.push(match[1]);
    }
  }
  return urls;
}

/**
 * Merge two sitemap XML documents.
 * Deduplicates by <loc> value.
 */
export function mergeSitemapXml(originXml: string, botmonXml: string): string {
  const originUrls = extractSitemapUrls(originXml);
  const botmonUrls = extractSitemapUrls(botmonXml);

  // Deduplicate
  const seen = new Set<string>();
  const allUrls: string[] = [];

  for (const url of [...originUrls, ...botmonUrls]) {
    if (!seen.has(url)) {
      seen.add(url);
      allUrls.push(url);
    }
  }

  // Build sitemap XML
  const urlEntries = allUrls
    .map((url) => `  <url>\n    <loc>${url}</loc>\n  </url>`)
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urlEntries}\n</urlset>`;
}
