# @botmonio/sdk

Official BotMon SDK for tracking web traffic analytics. Works with Cloudflare Workers, Fastly, and other edge platforms.

## Installation

```bash
npm install @botmonio/sdk
```

## Quick Start

```typescript
import { BotMon } from "@botmonio/sdk";

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    // Initialize SDK (singleton pattern)
    const sdk = BotMon.init({
      apiKey: env.BOTMON_API_KEY,
    });

    // Handle the request
    const response = await handleRequest(request);

    // Track the request (non-blocking)
    sdk.track(ctx, { request, response });

    return response;
  },
};
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

## Requirements

- Node.js 20.9+ (LTS)
- Cloudflare Workers / Fastly Compute / similar edge runtime

## License

Proprietary - See [LICENSE](./LICENSE) for details.

## Support

- Documentation: https://docs.botmon.io
- Issues: https://github.com/Botmonio/botmon-sdk/issues
- Email: hello@botmon.io
