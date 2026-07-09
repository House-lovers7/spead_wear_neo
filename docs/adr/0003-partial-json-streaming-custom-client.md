# ADR 0003: 部分JSONストリーミングを自作クライアント (fetch + parsePartialJson) で消費する

- ステータス: Accepted
- 日付: 2026-07-10

## コンテキスト

AI 解析の体感速度が製品の生命線。構造化出力 (Zod スキーマ) を保ちながら、
生成途中から画面に流し込みたい。さらに「解析中に画面を離れても完走して保存される」ことを
UX 要件にしている (シャッター→即遷移のため)。

サーバ側は ai@6 の `streamText({ output: Output.object({ schema }) })` +
`createTextStreamResponse({ textStream: result.textStream })` で部分JSONテキストを返せる
(注: 公式 cookbook の `toTextStream` + `createTextStreamResponse({ stream })` は ai@6.0.184 に存在しない。実APIは typecheck で確認済み)。

## 検討した選択肢

1. **@ai-sdk/react の `useObject`**: 実装最短。ただしフックがコンポーネントのライフサイクルに束縛され、
   ページ遷移/アンマウントでストリームが中断する。「画面を離れても完走」が満たせない
2. **自作クライアント (採用)**: `fetch` + `parsePartialJson` (ai パッケージが export) で
   部分JSONを逐次パースし、モジュールスコープのランナー (`lib/analysis-runner.ts`) から実行する

## 決定

- クライアントは `src/lib/ai/client.ts` の `streamJsonObject(url, body, onPartial)` に一本化
- 解析→照合のパイプラインは React 外の singleton (`analysis-runner.ts`) が実行し、
  進行中の部分オブジェクトは `useSyncExternalStore`、確定結果は IndexedDB + `useLiveQuery` で画面に届ける
- 完了時に必ず Zod (`snapAnalysisSchema` / `matchPlanSchema`) で最終検証してから保存する
- `@ai-sdk/react` は依存に含めない

## 帰結

- (+) 画面遷移・アンマウントに耐える解析。ユーザーを一切ブロックしない
- (+) 3つの API (analyze/match/categorize) とモックが同一プロトコルで動き、実装が1パターンに収まる
- (−) useObject が無料でくれる再試行・状態管理を自前で持つ (ランナーは ~100行)
- (−) `parsePartialJson` は ai パッケージの公開APIだが、メジャーアップデート時に挙動確認が必要

## 再評価する条件

- ai SDK が「コンポーネント非依存のオブジェクトストリーミング」を公式提供した場合
- ストリームの再接続 (ネットワーク断からの復帰) が要件になった場合
