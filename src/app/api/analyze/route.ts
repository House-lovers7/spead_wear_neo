import { createTextStreamResponse, Output, streamText } from "ai";
import { DEFAULT_MODEL, getGateway, isAiEnabled } from "@/lib/ai/gateway";
import { MOCK_SNAP_ANALYSIS, mockJsonTextStream } from "@/lib/ai/mock";
import { ANALYZE_SYSTEM, ANALYZE_USER_TEXT } from "@/lib/ai/prompts";
import { imageRequestSchema, snapAnalysisSchema } from "@/lib/ai/schemas";

/**
 * スナップ画像の分解。部分 JSON をテキストストリームで返し、
 * クライアント (useObject) が逐次パースして描画する。
 */

export const maxDuration = 120;

export async function POST(req: Request) {
  const parsed = imageRequestSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "invalid request body" }, { status: 400 });
  }

  // キー未設定 → モック解析 (擬似ストリーミング)。課金ゼロで全フローが動く
  if (!isAiEnabled()) {
    return createTextStreamResponse({ textStream: mockJsonTextStream(MOCK_SNAP_ANALYSIS) });
  }

  const gateway = getGateway();
  const result = streamText({
    model: gateway(DEFAULT_MODEL),
    system: ANALYZE_SYSTEM,
    output: Output.object({ schema: snapAnalysisSchema }),
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: ANALYZE_USER_TEXT },
          { type: "file", mediaType: "image", data: parsed.data.image },
        ],
      },
    ],
  });

  return createTextStreamResponse({ textStream: result.textStream });
}
