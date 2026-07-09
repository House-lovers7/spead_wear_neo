@AGENTS.md

# spead_wear_neo (SPEAD WEAR) — プロジェクト固有ルール

## プロダクト概要

「Shazam for Fashion Snap」— 気になったコーデをカメラでパシャすると、AIが魅力を分解し、
好みを蓄積し、手持ち服での再現案と本当に買うべきもの(不足アイテム)を返すスナップ翻訳 PWA。
対象: 服選びを時短したい・無駄買いを減らしたい一般ユーザー。

## 絶対守る設計原則

1. **待たせない**: 画像は送信前に必ずクライアント縮小 (`lib/image.ts`, 長辺1024px)。AI応答は必ず部分JSONストリーミングで逐次描画。シャッター後にユーザーをブロックする同期処理を追加しない
2. **解析は画面から切り離す**: AI 呼び出しは `lib/analysis-runner.ts` のモジュールスコープランナー経由。コンポーネント内で直接 fetch しない (画面を離れても完走して IndexedDB に保存される契約)
3. **断定しない**: パーソナルカラー/骨格の断定、「似合う」の断言は禁止。表現ポリシーは `lib/ai/prompts.ts` の COMMON_POLICY が唯一の原本
4. **モックで全フローが動く**: `AI_GATEWAY_API_KEY` 未設定でもカメラ→解析→照合→保存が E2E で動くこと。モック (`lib/ai/mock.ts`) はスキーマテストで実スキーマと整合を保証する

## 禁止事項

- 画像の base64 を IndexedDB に保存しない (Blob のまま保存)
- /api/match に画像を送らない (テキスト記述子のみ。速度・コスト契約)
- サーバ側 DB・認証を導入しない (ローカルファースト。導入するなら ADR を書く)

## 技術スタック (確定)

- Next.js 16 App Router + Tailwind CSS v4 (常時ダーク、深夜のアトリエ・トーン)
- ai@6 + @ai-sdk/gateway (Vercel AI Gateway)。解析=`AI_GATEWAY_MODEL` (Sonnet)、分類/照合=`AI_GATEWAY_MODEL_FAST` (Haiku)
- ストリーミング: サーバ `streamText + Output.object + createTextStreamResponse` / クライアント `fetch + parsePartialJson` (lib/ai/client.ts)
- Dexie 4 (IndexedDB) + dexie-react-hooks — snaps / closetItems の2テーブル
- Zod v4 (AI入出力とAPIボディの唯一のスキーマ原本: `lib/ai/schemas.ts`)
- Biome / Vitest
- フォント: Shippori Mincho (見出し) + Zen Kaku Gothic New (本文) + Geist Mono (eyebrow)

## ディレクトリ規則

```text
src/
├── app/
│   ├── page.tsx            # ホーム = カメラ (撮る→保存→解析開始→遷移)
│   ├── snap/[id]/          # コアUX: 分解/好きポイント/再現/買うべきもの の1画面
│   ├── snaps/              # ライブラリ + 好みプロファイル
│   ├── closet/             # クローゼット (撮影1回+確認1タップ登録)
│   └── api/                # analyze / match / closet/categorize (全てストリーム+モックフォールバック)
├── components/             # camera-capture / tab-nav / ui-bits
└── lib/
    ├── ai/                 # schemas (原本) / prompts / mock / gateway / client
    ├── db/local.ts         # Dexie 層 (楽観的保存・likedPoints 集計)
    ├── analysis-runner.ts  # バックグラウンド解析パイプライン (解析→照合)
    ├── image.ts            # 縮小/サムネ/フレーム切出し
    └── env.ts              # 環境変数 Zod 検証 (唯一の参照窓口)
```

## テスト方針

- `lib/ai/schemas` × `lib/ai/mock` の整合 (モックがスキーマ違反したら即検知)
- `lib/image.ts` の純粋計算 (fitWithin)、`lib/ai/prompts.ts` の契約 (id含む/画像含まない/断定禁止文言)
- `lib/db/local.ts` の純粋関数 (aggregateLikedPoints)
- カメラ・IndexedDB 実機挙動はブラウザ E2E (モックモード) で確認

## コミット方針

- Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`, `test:`)
- 1 コミット = 1 論理変更
- プッシュ前に `pnpm lint && pnpm typecheck && pnpm test && pnpm build` が通ること
