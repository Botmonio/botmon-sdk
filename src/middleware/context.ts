/**
 * Middleware Context Builder
 *
 * Builds a ResponseContext from the incoming request, origin response,
 * and Cloudflare-specific data (cf object).
 */

import type { ResponseContext } from "../types/middleware.types";
import type { TrafficType } from "../types/ingest-event.types";
import { detectAiBot } from "../geo/ai-bot-detector";

/**
 * Build a ResponseContext from request/response and CF env
 */
export function buildContext(
  request: Request,
  response: Response,
  env: unknown,
  ctx: ExecutionContext,
): ResponseContext {
  const url = new URL(request.url);
  const cf = (request as any).cf;
  const userAgent = request.headers.get("User-Agent") || "";

  // Detect AI bot from user agent
  const botDetection = detectAiBot(userAgent);

  // Classify traffic type (lightweight: AI bot or human)
  const trafficType: TrafficType = botDetection.isAiBot ? "good_bot" : "human";

  return {
    request,
    response,
    trafficType,
    botName: botDetection.botName,
    botCategory: botDetection.botCategory,
    botTags: botDetection.botTags,
    country: cf?.country || undefined,
    url,
    isAiBot: botDetection.isAiBot,
    env,
    ctx,
  };
}
