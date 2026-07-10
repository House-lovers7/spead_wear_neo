# 05. API 定義書

## 方針

- Route Handler 3本のみ。すべて **POST + JSON ボディ + 部分JSONテキストストリーム応答**の同一パターン
- サーバは何も保存しない (ステートレス中継)。認証なし (ローカルファースト、[03_architecture](03_architecture.md) 参照)
- リクエストは Zod (`src/lib/ai/schemas.ts`) で検証。スキーマがそのまま仕様の原本
- `AI_GATEWAY_API_KEY` 未設定時は全ルートがモック応答 (擬似遅延つきストリーム) にフォールバック

## 共通仕様

### 応答形式 (ストリーミング)

```text
200 OK
Content-Type: text/plain; charset=utf-8
Transfer-Encoding: chunked

{"mood":"力の抜けたきれいめカジュアル…","taste":["きれいめ"   ← 部分JSONが逐次届く
```

- ボディは**生成途中のJSONテキスト**がチャンクで流れる。クライアントは蓄積して `parsePartialJson` (ai パッケージ) で逐次パースする (`src/lib/ai/client.ts`)
- ストリーム完了時点で全体が完全なJSONになる。クライアントは最後に Zod で検証してから保存する

### エラーレスポンス

| ステータス | 条件 | ボディ |
|---|---|---|
| 400 | Zod 検証失敗 (形式不正・サイズ超過) | `{"error":"invalid request body"}` |
| 500 | AI Gateway 障害等 | (Next.js 既定) — クライアントは `AI API エラー (status)` として表示 |

クライアント側タイムアウト: 150s (`AbortSignal.timeout`)。サーバ `maxDuration`: analyze/match 120s, categorize 60s。

### デモゲート (任意、[ADR-0005](adr/0005-demo-passcode-gate.md))

`DEMO_PASSCODE` 設定時のみ、`src/proxy.ts` が全ページ・全 API を共有パスコード Cookie で保護する。
Cookie 未所持のリクエストは、ページ → `/login` へ 307、API → `401 {"error":"demo passcode required"}`。
未設定時 (ローカル開発の既定) はこの節は存在しないものとして扱ってよい。

---

## POST /api/analyze — スナップ分解

コーデ画像1枚を分解し `SnapAnalysis` をストリーム返却する。使用モデル: `AI_GATEWAY_MODEL` (既定 `anthropic/claude-sonnet-5`)。

### リクエスト (`imageRequestSchema`)

```jsonc
{
  // 必須。data:image/... 形式、最大2,000,000文字
  // クライアントで長辺1024px JPEGに縮小済みであること
  "image": "data:image/jpeg;base64,..."
}
```

### レスポンス (`snapAnalysisSchema` — 生成順 = 画面表示順)

| フィールド | 型 | 説明 |
|---|---|---|
| `mood` | string | 全体の雰囲気1文 (最初に届く) |
| `taste` | string[1..3] | テイスト (きれいめ/カジュアル/モード…) |
| `silhouette` | string | 全体シルエット (I/A/Yライン等) |
| `colorPalette.colors` | {name, hex}[2..5] | 主要色 (hexは `#rrggbb`、パレット表示用) |
| `colorPalette.tone` / `.contrast` | string | トーンとコントラストの言語化 |
| `keyItems` | {category, name, color, role}[2..] | 視認アイテム。`role: "hero"\|"support"` |
| `formality` | int 1..5 | フォーマル度 |
| `season` / `layering` | string | 想定季節 / 重ね着構造 |
| `appealPoints` | {label, why}[3..6] | 「何が良いのか」の分解。好きポイント候補 |
| `reproductionEssentials` | {item, why, substitutable, substitution?}[2..] | 再現の鍵 (優先度順) |

---

## POST /api/match — 手持ち照合

解析結果×手持ち服記述子から再現プラン `MatchPlan` をストリーム返却する。
**画像は送らない** (速度・コスト・プライバシー契約)。使用モデル: `AI_GATEWAY_MODEL_FAST` (既定 `anthropic/claude-haiku-4.5`)。

### リクエスト (`matchRequestSchema`)

```jsonc
{
  "analysis": { /* SnapAnalysis 全体 */ },
  "closet": [   // 1..200件。0件はクライアントが呼ばない契約 (400)
    {
      "id": "uuid",             // closetItems.id
      "category": "トップス",    // 9カテゴリ enum
      "name": "オフホワイトの無地Tシャツ",
      "colors": ["オフホワイト"],
      "silhouette": "レギュラー",
      "taste": ["カジュアル"],
      "seasons": ["春", "夏"],
      "formality": 2
    }
  ]
}
```

### レスポンス (`matchPlanSchema`)

| フィールド | 型 | 説明 |
|---|---|---|
| `outfits` | {title, itemIds[], styling, closeness 1..5, gapNotes}[0..3] | 手持ちで組める近似コーデ。`itemIds` は closet の id のみ使う契約 (プロンプトで強制、モックはテストで検証)。組めなければ空配列 |
| `missingItems` | {name, category, priority, reason, alternatives?}[] | 買い足し候補。`priority: "high"\|"medium"\|"low"`。reason に使い回し見込みを含む |
| `skipBuying` | {name, reason}[] | 買わなくていいもの (無駄買い防止) |

---

## POST /api/closet/categorize — アイテム自動分類

手持ち服の写真1枚から属性 `ClosetItemAttrs` をストリーム返却する。
クローゼット登録を「撮影1回+確認1タップ」にするための裏方。使用モデル: `AI_GATEWAY_MODEL_FAST`。

### リクエスト

`/api/analyze` と同じ `imageRequestSchema`。

### レスポンス (`closetItemAttrsSchema`)

```jsonc
{
  "category": "トップス",        // enum: トップス/ボトムス/アウター/ワンピース/靴/バッグ/帽子/アクセサリー/その他
  "name": "オフホワイトの無地Tシャツ",
  "colors": ["オフホワイト"],     // 1..3、日本語色名
  "silhouette": "レギュラー",
  "taste": ["カジュアル", "ミニマル"], // 1..3
  "seasons": ["春", "夏", "秋"],  // enum 春/夏/秋/冬、1..
  "formality": 2                  // int 1..5
}
```

クライアントは分類失敗時もデフォルト値補完で手動登録に退避する (登録フローを止めない)。

---

## POST /api/login — デモゲート入場 (AI 非使用)

`DEMO_PASSCODE` との一致を確認し、httpOnly Cookie (`sw_demo_gate`, 30日) を発行する。
唯一の非ストリーミングルート。

| 条件 | レスポンス |
|---|---|
| 一致 | `200 {"ok":true}` + `Set-Cookie` |
| 不一致 | `401 {"error":"passcode mismatch"}` |
| ボディ不正 | `400 {"error":"invalid request body"}` |
| ゲート無効 (`DEMO_PASSCODE` 未設定) | `404 {"error":"demo gate is disabled"}` |

リクエスト: `{"passcode": "..."}` (1..100文字)。

---

## プロンプト契約 (全ルート共通)

`src/lib/ai/prompts.ts` の `COMMON_POLICY` を system プロンプトに必ず含める:
パーソナルカラー/骨格の断定禁止・「似合う」と断言しない・提案理由の言語化・日本語出力。
この契約はユニットテスト (`prompts.test.ts`) で文言レベルで検証される。
