import { createTextStreamResponse, Output, streamText } from "ai";
import { FAST_MODEL, getGateway, isAiEnabled } from "@/lib/ai/gateway";
import { MOCK_CLOSET_ATTRS, mockJsonTextStream } from "@/lib/ai/mock";
import { CATEGORIZE_SYSTEM, CATEGORIZE_USER_TEXT } from "@/lib/ai/prompts";
import { closetItemAttrsSchema, imageRequestSchema } from "@/lib/ai/schemas";

/**
 * クローゼットアイテム写真の自動分類。登録の摩擦を「撮影1回 + 確認1タップ」に
 * 抑えるための裏方。小さいスキーマなので FAST_MODEL で十分。
 */

export const maxDuration = 60;

export async function POST(req: Request) {
  const parsed = imageRequestSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "invalid request body" }, { status: 400 });
  }

  if (!isAiEnabled()) {
    return createTextStreamResponse({
      textStream: mockJsonTextStream(MOCK_CLOSET_ATTRS, { chunkSize: 64, delayMs: 20 }),
    });
  }

  const gateway = getGateway();
  const result = streamText({
    model: gateway(FAST_MODEL),
    system: CATEGORIZE_SYSTEM,
    output: Output.object({ schema: closetItemAttrsSchema }),
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: CATEGORIZE_USER_TEXT },
          { type: "file", mediaType: "image", data: parsed.data.image },
        ],
      },
    ],
  });

  return createTextStreamResponse({ textStream: result.textStream });
}
