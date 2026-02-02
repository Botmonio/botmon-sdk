# @botmonio/sdk

Official BotMon SDK for tracking web traffic analytics. Works with Cloudflare Workers, Fastly, and other edge platforms.

## Installation

```bash
npm install @botmonio/sdk
```

## Integration Patterns

The SDK supports three integration patterns. Pick the one that fits your use-case.

### Pattern 1 — Analytics Only

Drop-in analytics tracking with no code-structure changes. This is the simplest integration.

```typescript
import { BotMon } from "@botmonio/sdk";

interface Env {
  BOTMON_API_KEY: string;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const sdk = BotMon.init({ apiKey: env.BOTMON_API_KEY });

    const startTime = Date.now();
    const response = await handleRequest(request, env);

    sdk.track(ctx, {
      request,
      response,
      startTime,
    });

    return response;
  },
};
```

### Pattern 2 — Full Middleware

The complete BotMon experience: analytics, managed robots.txt & sitemap, .well-known files, and AI bot optimisation (GEO).

```typescript
import { createCloudflareMiddleware } from "@botmonio/sdk";

export default createCloudflareMiddleware({
  apiKey: process.env.BOTMON_API_KEY,

  managedRules: {
    // Managed robots.txt — appends BotMon-managed directives to your
    // origin robots.txt so you keep existing rules intact.
    robotsTxt: {
      enabled: true,
      mode: "append",   // "append" | "merge" | "replace" | "disabled"
    },

    // Managed sitemap — merges BotMon-managed URLs into your origin
    // sitemap so search engines and AI crawlers discover all pages.
    sitemap: {
      enabled: true,
      mode: "merge",    // "append" | "merge" | "replace" | "disabled"
    },

    // Managed .well-known files — serves ai-plugin.json and llms.txt
    // for AI platforms that look for them.
    wellKnown: {
      enabled: true,
      files: {
        "ai-plugin.json": { mode: "replace" },
        "llms.txt":       { mode: "replace" },
      },
    },

    // GEO (Generative Engine Optimisation) — automatically enriches
    // HTML responses with structured data and summaries when the
    // request comes from an AI bot (e.g. GPTBot, ClaudeBot).
    // Human visitors always get the unmodified response.
    geo: {
      enabled: true,
      injectJsonLd: true,
      injectSummary: true,
      enrichHeadings: true,
      rules: [
        { urlPattern: "/products/*", pageType: "product" },
        { urlPattern: "/docs/**",    pageType: "docs" },
        { urlPattern: "/blog/**",    pageType: "article" },
        { urlPattern: "/pricing",    pageType: "pricing" },
        { urlPattern: "/faq",        pageType: "faq" },
        { urlPattern: "/api/**",     disabled: true },
      ],
    },
  },

  onResponse: async (context) => {
    if (context.isAiBot) {
      const modified = new Response(context.response.body, context.response);
      modified.headers.set("X-Optimised-For", context.botName ?? "ai-bot");
      return modified;
    }
    return context.response;
  },

  configCacheTtl: 300,
  debug: false,

})(async (request, env, ctx) => {
  return handleRequest(request, env);
});
```

### Pattern 3 — Minimal Middleware

A lightweight starting point: wrap your handler with the middleware and enable robots.txt management. You can turn on more features later from the BotMon dashboard without redeploying.

```typescript
import { createCloudflareMiddleware } from "@botmonio/sdk";

export default createCloudflareMiddleware({
  apiKey: process.env.BOTMON_API_KEY,

  managedRules: {
    robotsTxt: {
      enabled: true,
      mode: "append",
    },
  },
})(async (request, env, ctx) => {
  return handleRequest(request, env);
});
```

## Configuration

```typescript
const sdk = BotMon.init({
  // Required
  apiKey: "btmn_prod_xxx",           // Your BotMon API key

  // Optional - API endpoint
  ingestUrl: "https://...",          // Default: https://analytics.botmon.io/ingest

  // Optional - Retry settings
  retryAttempts: 3,                  // Default: 3
  retryBackoffMs: 1000,              // Default: 1000ms
  retryMaxBackoffMs: 30000,          // Default: 30000ms
  timeoutMs: 5000,                   // Default: 5000ms

  // Optional - Debug
  debug: false,                      // Default: false
  onError: (error, event) => {},     // Custom error handler

  // Optional - Bot detection provider
  botDetectionProvider: "cloudflare", // "cloudflare" | "fastly" | "akamai" | "none"

  // Optional - robots.txt capture (opt-in)
  captureRobotsTxt: false,           // Default: false
  robotsTxtMaxSize: 10240,           // Default: 10KB
});
```

## Tracking Options

```typescript
sdk.track(ctx, {
  request,                           // Required: Request object
  response,                          // Optional: Response object
  startTime: performance.now(),      // Optional: For response time calculation
  metadata: { userId: "123" },       // Optional: Custom metadata
});
```

## Security Features

- **Query string sanitization**: Sensitive parameters (tokens, passwords, API keys) are automatically removed
- **HTTPS-only**: The SDK enforces HTTPS for all API communications
- **Timeout protection**: Requests timeout after 5 seconds by default
- **robots.txt opt-in**: Response body capture is disabled by default

## Provider Adapters

The SDK can extract bot detection scores from your edge provider:

```typescript
// Cloudflare Bot Management
const sdk = BotMon.init({
  apiKey: env.BOTMON_API_KEY,
  botDetectionProvider: "cloudflare",
});
```

Supported providers: `cloudflare`, `fastly`, `akamai`, `none`

## Sample Worker

A complete working example is available in the [`examples/sample-worker`](./examples/sample-worker) directory. To try it:

```bash
cd examples/sample-worker
npm install
npx wrangler secret put BOTMON_API_KEY   # paste your API key
npx wrangler dev                         # local dev
npx wrangler deploy                      # deploy to Cloudflare
```

## Requirements

- Node.js 20.9+ (LTS)
- Cloudflare Workers / Fastly Compute / similar edge runtime

## License

Proprietary - See [LICENSE](./LICENSE) for details.

## Support

- Documentation: https://docs.botmon.io
- Issues: https://github.com/Botmonio/botmon-sdk/issues
- Email: hello@botmon.io
