# ADR 0004: AI Gateway 経由の2モデル戦略 (解析=Sonnet / 分類・照合=Haiku)

- ステータス: Accepted
- 日付: 2026-07-10

## コンテキスト

AI 呼び出しは3種類あり、要求水準が異なる。

| 用途 | 入力 | 要求 |
|---|---|---|
| スナップ分解 (analyze) | 画像 | ファッションのニュアンス理解 = **精度優先** |
| アイテム分類 (categorize) | 画像 | 定型的な属性抽出 = **速度・コスト優先** |
| 手持ち照合 (match) | テキストのみ | 構造化された突き合わせ = **速度・コスト優先** |

またプロバイダ直結 (`@ai-sdk/anthropic` 等) にするとモデル切替・コスト追跡が硬直する。

## 検討した選択肢

1. 全部 Sonnet — 品質は最高だが分類・照合で過剰コスト/レイテンシ
2. 全部 Haiku — 速いが主解析の言語化品質 (製品の核) が落ちるリスク
3. **2モデル分割 + AI Gateway (採用)**

## 決定

- Vercel AI Gateway 経由でのみモデルを呼ぶ (`@ai-sdk/gateway`、`lib/ai/gateway.ts` に集約)
- `AI_GATEWAY_MODEL` (既定 `anthropic/claude-sonnet-5`) = analyze 用
- `AI_GATEWAY_MODEL_FAST` (既定 `anthropic/claude-haiku-4.5`) = categorize / match 用
- どちらも env で差し替え可能 (コード変更なしで A/B 可能)
- キー未設定時はモック (`lib/ai/mock.ts`) に自動フォールバックし、課金ゼロで全フローが動く

## 実装上の注意 (実測で確認済み)

- Gateway のモデルIDは**ドット区切り** (`claude-haiku-4.5`)。ハイフン表記 (`claude-haiku-4-5`) は無効
- 実IDは認証不要の `https://ai-gateway.vercel.sh/v1/models` で確認できる

## 帰結

- (+) 主解析の品質と、分類/照合の速度・コストを両立
- (+) Gateway のコスト/レート追跡・フォールバック機構に乗れる。プロバイダロックイン低減
- (−) Gateway 障害が全AI機能の単一障害点 (モック退避でアプリ自体は生存)
- (−) 2モデルのプロンプト挙動差を意識する必要がある (照合の itemIds 契約はテストで担保)

## 再評価する条件

- 実利用でHaikuの照合品質が不足した場合 (env 切替のみで昇格可能)
- 解析コストが問題になった場合 (Sonnet→Haiku 降格 or キャッシュ導入)
