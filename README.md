# SPEAD WEAR — Shazam for Fashion Snap

気になったコーデを**パシャ**すると、AIが

1. **魅力を分解** — 何が良いのか (テイスト/シルエット/配色/主役アイテム/抜け感) を言語化
2. **好みを蓄積** — 「ここが好き」をタップで保存 → 自分の好みプロファイルに
3. **手持ちで再現** — クローゼットの服で組める近似コーデを最大3案
4. **買うべきものを特定** — 優先度つき不足アイテム + **買わなくていいもの** (無駄買い防止)

を1画面で返す「スナップ翻訳」PWA。画像検索でも単なるコーデ提案でもなく、
**憧れを実行可能な服選びに変換する**ことが芯。

## 体験設計 (レイテンシが命)

- 撮影画像はクライアントで長辺1024px JPEGに縮小してから送信
- シャッター直後に IndexedDB へ楽観的保存 → 即結果画面へ遷移。解析は部分JSONストリーミングで1〜2秒から流れ込む
- 解析はモジュールスコープのランナーで実行し、**画面を離れても完走**して保存される
- 手持ち照合は画像を送らずテキスト記述子のみ (高速・低コスト)
- クローゼット登録は「撮影1回 + 確認1タップ」。分類はAIが行う

## スタック

Next.js 16 (App Router) / React 19 / TypeScript strict / Tailwind CSS v4 /
ai@6 + Vercel AI Gateway (解析: Claude Sonnet 5, 分類・照合: Claude Haiku 4.5) /
Dexie (IndexedDB, ローカルファースト・サーバDBなし) / Zod v4 / Biome / Vitest

## 起動

```bash
pnpm install
cp env.example .env.local   # AI_GATEWAY_API_KEY 未設定でもモック解析で全フローが動く
pnpm dev
```

実AIを使う場合は [Vercel AI Gateway](https://vercel.com/docs/ai-gateway) でキーを発行し
`.env.local` の `AI_GATEWAY_API_KEY` に設定する (課金が発生する)。

検証:

```bash
pnpm lint && pnpm typecheck && pnpm test && pnpm build
```

## 実機 (iPhone/Android) でのカメラ確認

`getUserMedia` は HTTPS 必須のため、実機カメラは Vercel preview 等の HTTPS 環境で確認する。
ローカル開発は Mac のウェブカメラ、またはカメラ不可時のファイル選択フォールバックで代替できる。

## ドキュメント

| 文書 | 内容 |
|---|---|
| [docs/01_concept.md](docs/01_concept.md) | コンセプト・課題・コアUX原則・スコープ外 |
| [docs/02_requirements.md](docs/02_requirements.md) | 機能要件 (F1〜F10) / 非機能要件 / 用語定義 |
| [docs/03_architecture.md](docs/03_architecture.md) | システム構成図・シーケンス図 (Mermaid)・レイヤ構造 |
| [docs/04_er_diagram.md](docs/04_er_diagram.md) | ER図 (IndexedDB)・埋め込み型・インデックス方針 |
| [docs/05_api_design.md](docs/05_api_design.md) | API定義書 (3エンドポイント・ストリーム仕様・エラー規約) |
| [docs/adr/](docs/adr/) | ADR: ローカルファースト / 部分JSONストリーミング自作クライアント / 2モデル戦略 |

## 構成の要点

- `src/lib/ai/schemas.ts` — AI入出力の Zod スキーマ原本 (SnapAnalysis / MatchPlan / ClosetItemAttrs)
- `src/lib/ai/prompts.ts` — 表現ポリシー (パーソナルカラー/骨格の断定禁止、「似合う」と断言しない)
- `src/lib/analysis-runner.ts` — 解析→照合のバックグラウンドパイプライン
- `src/app/api/*` — streamText + Output.object のストリーミング3ルート (キー未設定時はモック)
- `src/lib/db/local.ts` — Dexie 層 (snaps / closetItems、likedPoints 集計)
