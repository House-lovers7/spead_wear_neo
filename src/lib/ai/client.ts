import { parsePartialJson } from "ai";

/**
 * API ルートが返す「部分 JSON テキストストリーム」を読むクライアント。
 *
 * useObject (React フック) ではなく素の fetch + parsePartialJson を使う理由:
 * 解析をコンポーネントのライフサイクルから切り離し、ユーザーが画面を離れても
 * バックグラウンドで完走して IndexedDB に保存できるようにするため (待ちストレス対策)。
 */
export async function streamJsonObject(
  url: string,
  body: unknown,
  onPartial?: (partial: unknown) => void,
): Promise<unknown> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`AI API エラー (${res.status})`);
  }
  if (!res.body) {
    throw new Error("AI API がストリームを返しませんでした");
  }

  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
  let acc = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    acc += value;
    if (onPartial) {
      const { value: parsed, state } = await parsePartialJson(acc);
      if (parsed !== undefined && (state === "successful-parse" || state === "repaired-parse")) {
        onPartial(parsed);
      }
    }
  }

  const { value: finalValue, state: finalState } = await parsePartialJson(acc);
  if (finalValue === undefined || finalState === "failed-parse") {
    throw new Error("AI 応答の JSON を解釈できませんでした");
  }
  return finalValue;
}
