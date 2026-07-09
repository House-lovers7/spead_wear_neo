import type { ClosetItemAttrs, MatchPlan, SnapAnalysis } from "./schemas";

/**
 * モック解析器。AI_GATEWAY_API_KEY 未設定時に API ルートがこれへフォールバックする。
 * 課金ゼロで カメラ → 解析 → 照合 の全フローを E2E で動かすためのもの。
 *
 * ストリーミング挙動も本物に寄せる: JSON 文字列をチャンク分割し、
 * 擬似遅延つきで流す (useObject は部分 JSON を逐次パースして描画する)。
 */

export const MOCK_SNAP_ANALYSIS: SnapAnalysis = {
  mood: "力の抜けたきれいめカジュアル。かっちりしすぎず、清潔感と余裕が両立している",
  taste: ["きれいめ", "カジュアル"],
  silhouette: "Iライン (上下ともすっきりした縦長シルエット)",
  colorPalette: {
    colors: [
      { name: "ネイビー", hex: "#1e2a3d" },
      { name: "オフホワイト", hex: "#f2efe8" },
      { name: "ブラウン", hex: "#7a5c3e" },
    ],
    tone: "低彩度のベーシックカラーでまとめたワントーン寄り",
    contrast: "上半身の濃紺と白Tのコントラストが顔まわりに視線を集めている",
  },
  keyItems: [
    {
      category: "アウター",
      name: "ネイビーのオーバーサイズテーラードジャケット",
      color: "ネイビー",
      role: "hero",
    },
    { category: "トップス", name: "白の無地Tシャツ", color: "オフホワイト", role: "support" },
    {
      category: "ボトムス",
      name: "ワイドテーパードのスラックス",
      color: "ネイビー",
      role: "support",
    },
    { category: "靴", name: "ブラウンのレザーローファー", color: "ブラウン", role: "support" },
  ],
  formality: 3,
  season: "春秋",
  layering: "ジャケット × Tシャツの2枚構造。インナーを白にして重さを回避",
  appealPoints: [
    {
      label: "首元の抜け感",
      why: "ジャケットにあえてTシャツを合わせることで、かっちり感が中和され余裕が出ている",
    },
    {
      label: "ワントーンの統一感",
      why: "上下をネイビーで揃えて縦のつながりを作り、脚長に見える効果を生んでいる",
    },
    {
      label: "足元の素材差し",
      why: "レザーのローファーが全体のカジュアルさを引き締め、大人っぽさを足している",
    },
  ],
  reproductionEssentials: [
    {
      item: "オーバーサイズのテーラードジャケット (濃色)",
      why: "このコーデの主役。肩の力が抜けたシルエットが雰囲気の核心",
      substitutable: true,
      substitution: "濃色のカーディガンでも近い抜け感は出せる",
    },
    {
      item: "白の無地Tシャツ",
      why: "顔まわりの明るさとカジュアルダウンの両方を担っている",
      substitutable: true,
      substitution: "白に近い淡色カットソーで代替可",
    },
    {
      item: "上下同系色の組み合わせ",
      why: "アイテムそのものより「縦につながる配色」が雰囲気を作っている",
      substitutable: false,
    },
  ],
};

export function mockMatchPlan(closetIds: string[]): MatchPlan {
  const ids = closetIds.slice(0, 3);
  return {
    outfits:
      ids.length >= 2
        ? [
            {
              title: "手持ちで作る抜け感きれいめ",
              itemIds: ids,
              styling:
                "ジャケット相当のアウターに白系インナーを合わせ、ボトムスは同系色で縦をつなげる。裾は軽くたるませてリラックス感を出す",
              closeness: 4,
              gapNotes: "素材の光沢感がスナップよりカジュアル寄り。足元をレザー系にすると埋まる",
            },
            {
              title: "配色だけ再現するミニマル案",
              itemIds: ids.slice(0, 2),
              styling: "アイテムは変えて、ネイビー×白の配色バランスだけを踏襲する",
              closeness: 3,
              gapNotes: "シルエットのゆとりが不足。サイズ感の近いアイテムを優先して選ぶと良い",
            },
          ]
        : [],
    missingItems: [
      {
        name: "オーバーサイズテーラードジャケット (ネイビー)",
        category: "アウター",
        priority: "high",
        reason:
          "このスナップの主役で、手持ちに相当品がない。手持ちの白T・デニム・スラックスの少なくとも3点と組めるため使い回し効率が高い",
        alternatives: "まずは濃色カーディガンで雰囲気を試してから投資判断しても良い",
      },
      {
        name: "レザーローファー (ブラウン)",
        category: "靴",
        priority: "medium",
        reason: "足元の引き締め役。きれいめ系の手持ちボトムス全般と相性が良い可能性が高い",
      },
    ],
    skipBuying: [
      {
        name: "白の無地Tシャツ",
        reason: "手持ちの淡色カットソーで十分代替できる。同型の買い足しは使用頻度が分散するだけ",
      },
    ],
  };
}

export const MOCK_CLOSET_ATTRS: ClosetItemAttrs = {
  category: "トップス",
  name: "オフホワイトの無地Tシャツ",
  colors: ["オフホワイト"],
  silhouette: "レギュラー",
  taste: ["カジュアル", "ミニマル"],
  seasons: ["春", "夏", "秋"],
  formality: 2,
};

/**
 * オブジェクトを JSON 文字列にし、チャンク分割 + 擬似遅延つきで流すテキストストリーム。
 * useObject 側は部分 JSON を逐次パースするため、本物の streamText と同じ見え方になる。
 */
export function mockJsonTextStream(
  value: unknown,
  { chunkSize = 48, delayMs = 30 }: { chunkSize?: number; delayMs?: number } = {},
): ReadableStream<string> {
  const json = JSON.stringify(value);
  let offset = 0;
  return new ReadableStream<string>({
    async pull(controller) {
      if (offset >= json.length) {
        controller.close();
        return;
      }
      if (delayMs > 0) await new Promise((r) => setTimeout(r, delayMs));
      controller.enqueue(json.slice(offset, offset + chunkSize));
      offset += chunkSize;
    },
  });
}
