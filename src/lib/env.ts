import { z } from "zod";

/**
 * 起動時に環境変数を Zod で検証する。
 *
 * 規約: アプリコードから `process.env` を直接参照せず、必ずこのモジュール経由で読む。
 * (next.config.ts などビルドツール設定は例外)
 *
 * このアプリはローカルファースト (IndexedDB) のため、サーバ環境変数は AI Gateway のみ。
 * AI_GATEWAY_API_KEY 未設定時はモック解析器で全機能が動く (課金ゼロで開発・デモ可能)。
 */

const serverSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

  // Vercel AI Gateway (任意 — 未設定ならモック解析にフォールバック)
  AI_GATEWAY_API_KEY: z.string().optional(),
  /** スナップ解析用 (精度優先)。 */
  AI_GATEWAY_MODEL: z.string().default("anthropic/claude-sonnet-5"),
  /** クローゼット自動分類・照合用 (速度・コスト優先)。 */
  AI_GATEWAY_MODEL_FAST: z.string().default("anthropic/claude-haiku-4.5"),

  // アプリの公開 URL (絶対 URL 生成に使う)
  APP_URL: z.string().url().default("http://localhost:3000"),

  // デモゲート用の共有パスコード (任意 — 未設定ならゲート無効で全公開)
  DEMO_PASSCODE: z.string().min(4).optional(),
});

export type ServerEnv = z.infer<typeof serverSchema>;

const isServer = typeof window === "undefined";

// クライアントに露出する環境変数はなし (ローカルファースト設計)。
let _env: ServerEnv;

if (isServer) {
  const parsed = serverSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error(
      "❌ Invalid environment variables:",
      JSON.stringify(z.treeifyError(parsed.error), null, 2),
    );
    throw new Error("Invalid environment variables — see log above");
  }
  _env = parsed.data;
} else {
  _env = {} as ServerEnv;
}

export const env = _env;
