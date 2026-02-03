/* eslint-disable */
/**
 * Sample Cloudflare Worker — BotMon SDK v0.7 Integration
 *
 * Demonstrates three integration patterns:
 *   1. Analytics-only        (BotMon.init + track)
 *   2. Full middleware        (createCloudflareMiddleware with all managed rules)
 *   3. Minimal middleware     (middleware with analytics + robots.txt only)
 *
 * Pick the pattern that fits your use-case and delete the others.
 */

import {
  BotMon,
  createCloudflareMiddleware,
} from "@botmonio/sdk";

// ─── Environment bindings ────────────────────────────────────────────
interface Env {
  BOTMON_API_KEY: string;
  // Add your own bindings here (KV, D1, R2, etc.)
}

// ─── Your application handler ────────────────────────────────────────
async function handleRequest(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);

  if (url.pathname === "/") {
    return new Response("<h1>Hello World</h1>", {
      headers: { "content-type": "text/html" },
    });
  }

  if (url.pathname === "/api/health") {
    return Response.json({ status: "ok" });
  }

  return new Response("Not Found", { status: 404 });
}

// =====================================================================
// Pattern 1 — Analytics Only (drop-in, no code-structure changes)
// =====================================================================
// Use this if you only need traffic analytics and bot classification.
// This is the same API as v0.6 — upgrading to v0.7 requires zero changes.
//
// export default {
//   async fetch(request: Request, env: Env, ctx: ExecutionContext) {
//     const sdk = BotMon.init({ apiKey: env.BOTMON_API_KEY });
//
//     const startTime = Date.now();
//     const response = await handleRequest(request, env);
//
//     sdk.track(ctx, {
//       request,
//       response,
//       startTime,
//     });
//
//     return response;
//   },
// };

// =====================================================================
// Pattern 2 — Full Middleware (all managed rules + GEO)
// =====================================================================
// Use this for the complete BotMon experience: analytics, managed
// robots.txt & sitemap, .well-known files, and AI bot optimisation.
//
// export default createCloudflareMiddleware({
//   // apiKey is read from env.BOTMON_API_KEY automatically, or pass explicitly:
//   // apiKey: env.BOTMON_API_KEY,
//
//   managedRules: {
//     // Managed robots.txt — appends BotMon-managed directives to your
//     // origin robots.txt so you keep existing rules intact.
//     robotsTxt: {
//       enabled: true,
//       mode: "append",   // "append" | "merge" | "replace" | "disabled"
//     },
//
//     // Managed sitemap — merges BotMon-managed URLs into your origin
//     // sitemap so search engines and AI crawlers discover all pages.
//     sitemap: {
//       enabled: true,
//       mode: "merge",    // "append" | "merge" | "replace" | "disabled"
//     },
//
//     // Managed .well-known files — serves ai-plugin.json and llms.txt
//     // for AI platforms that look for them.
//     wellKnown: {
//       enabled: true,
//       files: {
//         "ai-plugin.json": { mode: "replace" },
//         "llms.txt":       { mode: "replace" },
//       },
//     },
//
//     // GEO (Generative Engine Optimisation) — automatically enriches
//     // HTML responses with structured data and summaries when the
//     // request comes from an AI bot (e.g. GPTBot, ClaudeBot).
//     // Human visitors always get the unmodified response.
//     geo: {
//       enabled: true,
//       injectJsonLd: true,
//       injectSummary: true,
//       enrichHeadings: true,
//       rules: [
//         { urlPattern: "/products/*", pageType: "product" },
//         { urlPattern: "/docs/**",    pageType: "docs" },
//         { urlPattern: "/blog/**",    pageType: "article" },
//         { urlPattern: "/pricing",    pageType: "pricing" },
//         { urlPattern: "/faq",        pageType: "faq" },
//         // Disable GEO for specific paths
//         { urlPattern: "/api/**",     disabled: true },
//       ],
//     },
//   },
//
//   // Optional — hook into the response pipeline for custom logic
//   onResponse: async (context) => {
//     // Example: add a custom header for AI bot requests
//     if (context.isAiBot) {
//       const modified = new Response(context.response.body, context.response);
//       modified.headers.set("X-Optimised-For", context.botName ?? "ai-bot");
//       return modified;
//     }
//     return context.response;
//   },
//
//   // Optional — remote config cache TTL (default: 300s)
//   configCacheTtl: 300,
//
//   // Optional — debug mode logs to console
//   debug: false,
//
// })(async (request, env, ctx) => {
//   return handleRequest(request, env as Env);
// });

// =====================================================================
// Pattern 3 — Minimal Middleware (analytics + robots.txt only)
// =====================================================================
// A lightweight starting point: just wrap your handler with the
// middleware and enable robots.txt management. You can turn on more
// features later from the BotMon dashboard without redeploying.

// apiKey is read from env.BOTMON_API_KEY automatically by the SDK
export default createCloudflareMiddleware({
  managedRules: {
    robotsTxt: {
      enabled: true,
      mode: "append",
    },
  },
})(async (request, env, ctx) => {
  return handleRequest(request, env as Env);
});
