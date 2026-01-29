/**
 * Remote Config API Client
 *
 * Fetches and caches a single config bundle per hostname from the BotMon API.
 * Uses Cloudflare Workers Cache API for edge caching.
 *
 * Performance:
 * - Cold start: 1 fetch (~100-200ms) → cached for configurable TTL
 * - Warm: 0 fetches → config from edge cache (~1-5ms)
 * - API down: 0 fetches → returns null (caller falls back to SDK defaults)
 */

import type { RemoteConfigBundle } from "../types/managed-rules.types";

/**
 * Access Cloudflare Workers Cache API (`caches.default`)
 * Standard CacheStorage doesn't include `default`, but CF Workers does.
 */
function getDefaultCache(): Cache | null {
  try {
    return (caches as any).default as Cache;
  } catch {
    return null;
  }
}

/**
 * Fetch remote config bundle for a hostname.
 * Returns null if no config exists or API is unreachable.
 */
export async function fetchConfig(
  hostname: string,
  apiKey: string,
  apiBaseUrl: string,
  cacheTtlSeconds: number,
): Promise<RemoteConfigBundle | null> {
  const cacheUrl = `${apiBaseUrl}/v1/sdk-config/${encodeURIComponent(hostname)}`;

  // Try edge cache first (Cloudflare Workers Cache API)
  try {
    const cache = getDefaultCache();
    if (!cache) throw new Error("no cache");
    const cacheKey = new Request(cacheUrl, {
      headers: { "X-API-Key": apiKey },
    });

    const cachedResponse = await cache.match(cacheKey);
    if (cachedResponse) {
      const body = await cachedResponse.json();
      return body as RemoteConfigBundle;
    }
  } catch {
    // Cache miss or Cache API unavailable — proceed to fetch
  }

  // Fetch from API
  try {
    const response = await fetch(cacheUrl, {
      method: "GET",
      headers: {
        "X-API-Key": apiKey,
        "Accept": "application/json",
      },
    });

    if (response.status === 404) {
      // No config for this hostname — cache the empty result
      await cacheResponse(cacheUrl, apiKey, new Response("null", {
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": `public, max-age=${cacheTtlSeconds}`,
        },
      }));
      return null;
    }

    if (!response.ok) {
      // API error — return null (caller uses SDK defaults)
      return null;
    }

    const body = await response.json();

    // Cache the successful response
    const cacheableResponse = new Response(JSON.stringify(body), {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": `public, max-age=${cacheTtlSeconds}`,
      },
    });
    await cacheResponse(cacheUrl, apiKey, cacheableResponse);

    return body as RemoteConfigBundle;
  } catch {
    // Network error — return null (caller uses SDK defaults)
    return null;
  }
}

/**
 * Store a response in the edge cache
 */
async function cacheResponse(
  url: string,
  apiKey: string,
  response: Response,
): Promise<void> {
  try {
    const cache = getDefaultCache();
    if (!cache) return;
    const cacheKey = new Request(url, {
      headers: { "X-API-Key": apiKey },
    });
    await cache.put(cacheKey, response);
  } catch {
    // Cache write failure is non-fatal
  }
}
