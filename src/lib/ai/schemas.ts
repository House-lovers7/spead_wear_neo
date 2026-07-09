import { z } from "zod";

/**
 * AI 入出力の Zod スキーマ (クライアント / サーバ共有)。
 *
 * ストリーミング表示を前提に、先に画面へ出したいフィールドほど
 * スキーマの前方に置く (LLM はスキーマ順に生成する傾向があるため)。
 *
 * 表現ポリシー: パーソナルカラー (ブルベ/イエベ)・骨格タイプは断定しない。
 * 「似合う」ではなく「近づけやすい / 相性が良い可能性」等の見え方ベースで記述する。
 * このポリシーは prompts.ts の system プロンプトで強制する。
 */

/** クローゼットアイテムのカテゴリ (スナップ解析の keyItems とも共有)。 */
export const itemCategories = [
  "トップス",
  "ボトムス",
  "アウター",
  "ワンピース",
  "靴",
  "バッグ",
  "帽子",
  "アクセサリー",
  "その他",
] as const;

export const itemCategorySchema = z.enum(itemCategories);
export type ItemCategory = z.infer<typeof itemCategorySchema>;

/** スナップ1枚の分解結果。 */
export const snapAnalysisSchema = z.object({
  mood: z.string().describe("コーデ全体の雰囲気を1文で (最初に出す)"),
  taste: z
    .array(z.string())
    .min(1)
    .max(3)
    .describe("テイスト。例: きれいめ, カジュアル, モード, ストリート, フェミニン, ミニマル"),
  silhouette: z.string().describe("全体シルエット。例: Iライン, Aライン, Yライン, リラックス"),
  colorPalette: z.object({
    colors: z
      .array(
        z.object({
          name: z.string().describe("日本語の色名。例: ネイビー"),
          hex: z
            .string()
            .regex(/^#[0-9a-fA-F]{6}$/)
            .describe("画像から読み取った近似色の hex。例: #1f2a44"),
        }),
      )
      .min(2)
      .max(5)
      .describe("主要色 (視覚パレット表示に使う)"),
    tone: z.string().describe("トーンの説明。例: モノトーン, アースカラー, 淡色ワントーン"),
    contrast: z.string().describe("コントラストの強さと、どこで効いているか"),
  }),
  keyItems: z
    .array(
      z.object({
        category: itemCategorySchema,
        name: z.string().describe("アイテムの短い名前。例: オーバーサイズの黒テーラードジャケット"),
        color: z.string(),
        role: z.enum(["hero", "support"]).describe("hero=コーデの主役 / support=脇役"),
      }),
    )
    .min(2)
    .describe("画像から視認できる主要アイテム"),
  formality: z.number().int().min(1).max(5).describe("フォーマル度 1=ラフ 5=フォーマル"),
  season: z.string().describe("想定季節。例: 春秋, 夏, 冬"),
  layering: z.string().describe("レイヤード(重ね着)の構造。なければ「レイヤードなし」"),
  appealPoints: z
    .array(
      z.object({
        label: z.string().describe("魅力の短いラベル。例: 抜け感のある首元"),
        why: z.string().describe("なぜ魅力的に見えるかの言語化"),
      }),
    )
    .min(3)
    .max(6)
    .describe("このスナップの「何が良いのか」の分解。好きポイント候補になる"),
  reproductionEssentials: z
    .array(
      z.object({
        item: z.string().describe("再現の鍵になる要素"),
        why: z.string().describe("なぜそれが雰囲気を作っているか"),
        substitutable: z.boolean().describe("手持ちの類似品で代替可能か"),
        substitution: z.string().optional().describe("代替する場合の目安"),
      }),
    )
    .min(2)
    .describe("雰囲気を再現するために押さえるべき要素 (主役から順に)"),
});

export type SnapAnalysis = z.infer<typeof snapAnalysisSchema>;

/** 手持ち服との照合結果 (再現プラン)。 */
export const matchPlanSchema = z.object({
  outfits: z
    .array(
      z.object({
        title: z.string().describe("コーデ案の短いタイトル"),
        itemIds: z.array(z.string()).describe("使用する手持ちアイテムの id"),
        styling: z.string().describe("着こなしのポイント (どう組むか)"),
        closeness: z.number().int().min(1).max(5).describe("元スナップへの近さ 1-5"),
        gapNotes: z.string().describe("元スナップとの差分と、手持ちでの埋め方"),
      }),
    )
    .max(3)
    .describe("手持ち服で組める近似コーデ。最大3案。組めなければ空配列"),
  missingItems: z
    .array(
      z.object({
        name: z.string().describe("買い足し候補のアイテム名"),
        category: itemCategorySchema,
        priority: z.enum(["high", "medium", "low"]).describe("high=これが無いと雰囲気が出ない"),
        reason: z.string().describe("なぜ必要か + 手持ちとの使い回し見込み"),
        alternatives: z.string().optional().describe("代替案 (安く済ませる/手持ち流用)"),
      }),
    )
    .describe("不足アイテム。優先度つき"),
  skipBuying: z
    .array(
      z.object({
        name: z.string(),
        reason: z.string().describe("なぜ買わなくていいか (類似品あり/使用頻度低 等)"),
      }),
    )
    .describe("買わなくていいもの (無駄買い防止)"),
});

export type MatchPlan = z.infer<typeof matchPlanSchema>;

/** クローゼットアイテム写真の自動分類結果。 */
export const closetItemAttrsSchema = z.object({
  category: itemCategorySchema,
  name: z.string().describe("アイテムの短い名前。例: ネイビーのテーパードスラックス"),
  colors: z.array(z.string()).min(1).max(3).describe("主要色 (日本語)"),
  silhouette: z.string().describe("シルエット。例: テーパード, オーバーサイズ, ストレート"),
  taste: z.array(z.string()).min(1).max(3).describe("テイスト"),
  seasons: z
    .array(z.enum(["春", "夏", "秋", "冬"]))
    .min(1)
    .describe("着用できる季節"),
  formality: z.number().int().min(1).max(5),
});

export type ClosetItemAttrs = z.infer<typeof closetItemAttrsSchema>;

/** 照合 API に渡す手持ちアイテムの軽量記述子 (画像は送らない — 速度/コスト対策)。 */
export const closetDescriptorSchema = closetItemAttrsSchema.extend({
  id: z.string(),
});

export type ClosetDescriptor = z.infer<typeof closetDescriptorSchema>;

/** /api/analyze・/api/closet/categorize のリクエストボディ。 */
export const imageRequestSchema = z.object({
  /** data URL (image/jpeg, クライアントで長辺1024pxに縮小済み)。 */
  image: z
    .string()
    .startsWith("data:image/")
    .max(2_000_000, "画像が大きすぎます (縮小処理を通してください)"),
});

/** /api/match のリクエストボディ。 */
export const matchRequestSchema = z.object({
  analysis: snapAnalysisSchema,
  closet: z.array(closetDescriptorSchema).min(1).max(200),
});
