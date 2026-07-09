import { createTextStreamResponse, Output, streamText } from "ai";
import { FAST_MODEL, getGateway, isAiEnabled } from "@/lib/ai/gateway";
import { mockJsonTextStream, mockMatchPlan } from "@/lib/ai/mock";
import { buildMatchUserText, MATCH_SYSTEM } from "@/lib/ai/prompts";
import { matchPlanSchema, matchRequestSchema } from "@/lib/ai/schemas";

/**
 * 解析結果 × 手持ち服の照合 → 再現プラン。
 * 画像は送らずテキスト記述子のみ (速度・コスト対策) のため FAST_MODEL を使う。
 */

export const maxDuration = 120;

export async function POST(req: Request) {
  const parsed = matchRequestSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "invalid request body" }, { status: 400 });
  }

  if (!isAiEnabled()) {
    const ids = parsed.data.closet.map((item) => item.id);
    return createTextStreamResponse({ textStream: mockJsonTextStream(mockMatchPlan(ids)) });
  }

  const gateway = getGateway();
  const result = streamText({
    model: gateway(FAST_MODEL),
    system: MATCH_SYSTEM,
    output: Output.object({ schema: matchPlanSchema }),
    prompt: buildMatchUserText(parsed.data.analysis, parsed.data.closet),
  });

  return createTextStreamResponse({ textStream: result.textStream });
}
