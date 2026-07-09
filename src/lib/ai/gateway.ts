import { createGateway } from "@ai-sdk/gateway";
import { env } from "@/lib/env";

/**
 * Vercel AI Gateway のクライアント集約 (ai@6 + @ai-sdk/gateway)。
 *
 * AI Gateway を選ぶ理由: 複数 provider を 1 鍵で切り替えられる + コスト/レート追跡。
 * 直接 provider SDK を叩くより弾力的に差し替えられる。
 *
 * 使い方:
 * ```ts
 * import { generateText } from "ai";
 * import { DEFAULT_MODEL, getGateway } from "@/lib/ai/gateway";
 *
 * const gateway = getGateway(); // AI_GATEWAY_API_KEY 未設定なら throw — 呼び出し側で捕捉して Result に包む
 * const { text } = await generateText({
 *   model: gateway(DEFAULT_MODEL),
 *   system: "...",
 *   prompt: "...",
 * });
 * ```
 */

let cached: ReturnType<typeof createGateway> | null = null;

export function getGateway() {
  if (cached) return cached;
  if (!env.AI_GATEWAY_API_KEY) {
    throw new Error(
      "AI_GATEWAY_API_KEY が設定されていません。Vercel AI Gateway のキーを .env.local に追加してください。",
    );
  }
  cached = createGateway({ apiKey: env.AI_GATEWAY_API_KEY });
  return cached;
}

/** スナップ解析用モデル (精度優先)。env の AI_GATEWAY_MODEL で上書き可能。 */
export const DEFAULT_MODEL = env.AI_GATEWAY_MODEL;

/** 分類・照合用モデル (速度/コスト優先)。env の AI_GATEWAY_MODEL_FAST で上書き可能。 */
export const FAST_MODEL = env.AI_GATEWAY_MODEL_FAST;

/** AI 機能が有効か (キー未設定なら UI を disabled にする等の判定に使う)。 */
export function isAiEnabled(): boolean {
  return Boolean(env.AI_GATEWAY_API_KEY);
}
