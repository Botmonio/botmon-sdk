/**
 * HTML Utilities
 *
 * Lightweight HTML extraction helpers using regex (no DOM parser).
 * Designed for edge execution with zero dependencies.
 */

/**
 * Extract <title> content
 */
export function extractTitle(html: string): string | null {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match ? decodeHtmlEntities(match[1].trim()) : null;
}

/**
 * Extract meta description
 */
export function extractMetaDescription(html: string): string | null {
  const match = html.match(
    /<meta[^>]*name=["']description["'][^>]*content=["']([\s\S]*?)["']/i,
  ) || html.match(
    /<meta[^>]*content=["']([\s\S]*?)["'][^>]*name=["']description["']/i,
  );
  return match ? decodeHtmlEntities(match[1].trim()) : null;
}

/**
 * Extract og:description
 */
export function extractOgDescription(html: string): string | null {
  const match = html.match(
    /<meta[^>]*property=["']og:description["'][^>]*content=["']([\s\S]*?)["']/i,
  ) || html.match(
    /<meta[^>]*content=["']([\s\S]*?)["'][^>]*property=["']og:description["']/i,
  );
  return match ? decodeHtmlEntities(match[1].trim()) : null;
}

/**
 * Extract og:title
 */
export function extractOgTitle(html: string): string | null {
  const match = html.match(
    /<meta[^>]*property=["']og:title["'][^>]*content=["']([\s\S]*?)["']/i,
  ) || html.match(
    /<meta[^>]*content=["']([\s\S]*?)["'][^>]*property=["']og:title["']/i,
  );
  return match ? decodeHtmlEntities(match[1].trim()) : null;
}

/**
 * Extract og:image
 */
export function extractOgImage(html: string): string | null {
  const match = html.match(
    /<meta[^>]*property=["']og:image["'][^>]*content=["']([\s\S]*?)["']/i,
  ) || html.match(
    /<meta[^>]*content=["']([\s\S]*?)["'][^>]*property=["']og:image["']/i,
  );
  return match ? match[1].trim() : null;
}

/**
 * Extract first meaningful paragraph text
 */
export function extractFirstParagraph(html: string): string | null {
  // Find paragraphs, skip very short ones (likely UI elements)
  const paragraphs = html.match(/<p[^>]*>([\s\S]*?)<\/p>/gi);
  if (!paragraphs) return null;

  for (const p of paragraphs) {
    const content = stripHtml(p).trim();
    if (content.length >= 50) {
      return content.substring(0, 300);
    }
  }
  return null;
}

/**
 * Extract all headings with their levels
 */
export function extractHeadings(html: string): Array<{ level: number; text: string }> {
  const headings: Array<{ level: number; text: string }> = [];
  const regex = /<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(html)) !== null) {
    headings.push({
      level: parseInt(match[1], 10),
      text: stripHtml(match[2]).trim(),
    });
  }

  return headings;
}

/**
 * Extract FAQ question-answer pairs from HTML
 * Looks for H2/H3 followed by paragraph content
 */
export function extractFaqPairs(html: string): Array<{ question: string; answer: string }> {
  const pairs: Array<{ question: string; answer: string }> = [];

  // Match h2/h3 that end with ? followed by content until next heading
  const regex = /<h[23][^>]*>([\s\S]*?\?[\s\S]*?)<\/h[23]>([\s\S]*?)(?=<h[1-6]|$)/gi;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(html)) !== null) {
    const question = stripHtml(match[1]).trim();
    const answer = stripHtml(match[2]).trim();

    if (question && answer && answer.length > 10) {
      pairs.push({ question, answer: answer.substring(0, 500) });
    }
  }

  return pairs;
}

/**
 * Extract ordered list steps (for HowTo schema)
 */
export function extractOrderedListSteps(html: string): string[] {
  const steps: string[] = [];
  const olMatch = html.match(/<ol[^>]*>([\s\S]*?)<\/ol>/i);
  if (!olMatch) return steps;

  const liRegex = /<li[^>]*>([\s\S]*?)<\/li>/gi;
  let match: RegExpExecArray | null;
  while ((match = liRegex.exec(olMatch[1])) !== null) {
    const text = stripHtml(match[1]).trim();
    if (text) steps.push(text);
  }

  return steps;
}

/**
 * Extract price values from HTML
 */
export function extractPrices(html: string): Array<{ value: string; currency: string }> {
  const prices: Array<{ value: string; currency: string }> = [];

  // USD format: $99.99
  const usdRegex = /\$(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/g;
  let match: RegExpExecArray | null;
  while ((match = usdRegex.exec(html)) !== null) {
    prices.push({ value: match[1].replace(/,/g, ""), currency: "USD" });
  }

  return prices;
}

/**
 * Strip HTML tags from a string
 */
export function stripHtml(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Decode basic HTML entities
 */
function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, "/");
}

/**
 * Escape a string for use in HTML attributes
 */
export function escapeHtmlAttr(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
