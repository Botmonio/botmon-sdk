/**
 * Provider Bot Detection Adapters
 *
 * Extracts upstream bot detection data from CDN providers (Cloudflare, Fastly, etc.)
 */

/**
 * Extracted bot data from provider
 */
export interface ProviderBotData {
  score?: number;           // Upstream bot score (0-100, provider-specific)
  verified?: boolean;       // Is this a verified bot
  classification?: string;  // Provider's bot classification
  provider: string;         // 'cloudflare' | 'fastly' | 'akamai' | 'cloudfront'
}

/**
 * Provider adapter interface
 */
export interface ProviderAdapter {
  extractBotData(request: Request): ProviderBotData | null;
}

/**
 * Cloudflare Bot Management adapter
 * Extracts data from request.cf.botManagement
 */
export class CloudflareAdapter implements ProviderAdapter {
  extractBotData(request: Request): ProviderBotData | null {
    const cf = (request as any).cf;
    if (!cf?.botManagement) return null;

    return {
      score: cf.botManagement.score,
      verified: cf.botManagement.verifiedBot || false,
      classification: cf.botManagement.ja3Hash ? "fingerprinted" : undefined,
      provider: "cloudflare",
    };
  }
}

/**
 * Generic adapter for unsupported providers
 * Returns null (graceful degradation)
 */
export class GenericAdapter implements ProviderAdapter {
  extractBotData(_request: Request): ProviderBotData | null {
    return null;
  }
}

/**
 * Supported bot detection providers
 */
export type BotDetectionProvider = "cloudflare" | "fastly" | "akamai" | "cloudfront" | "none";

/**
 * Factory function to create provider adapter
 */
export function createProviderAdapter(provider: BotDetectionProvider): ProviderAdapter {
  switch (provider) {
    case "cloudflare":
      return new CloudflareAdapter();
    case "fastly":
    case "akamai":
    case "cloudfront":
    case "none":
    default:
      return new GenericAdapter();
  }
}
