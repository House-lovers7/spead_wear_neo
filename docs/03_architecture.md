# 03. アーキテクチャ

## 全体構成図 (システム構成)

サーバDBを持たない**ローカルファースト + ステートレスAI中継**構成。

```mermaid
flowchart LR
    subgraph Device["ユーザー端末 (ブラウザ / PWA)"]
        CAM["カメラ<br/>getUserMedia + input capture"]
        UI["画面 (React 19)<br/>/ · /snap/[id] · /snaps · /closet"]
        RUNNER["解析ランナー<br/>lib/analysis-runner.ts<br/>(モジュールスコープ・画面非依存)"]
        IMG["画像処理<br/>lib/image.ts<br/>長辺1024px JPEG縮小"]
        IDB[("IndexedDB (Dexie)<br/>snaps / closetItems<br/>画像はBlobのまま保存")]
    end

    subgraph Vercel["Vercel (Fluid Compute · ステートレス)"]
        A1["POST /api/analyze<br/>スナップ分解 (画像)"]
        A2["POST /api/match<br/>手持ち照合 (テキストのみ)"]
        A3["POST /api/closet/categorize<br/>アイテム分類 (画像)"]
        MOCK["モックフォールバック<br/>キー未設定時 (課金ゼロ)"]
    end

    subgraph GW["Vercel AI Gateway"]
        SONNET["anthropic/claude-sonnet-5<br/>(解析・精度優先)"]
        HAIKU["anthropic/claude-haiku-4.5<br/>(分類・照合・速度優先)"]
    end

    CAM --> IMG --> IDB
    UI <-->|useLiveQuery| IDB
    IMG --> RUNNER
    RUNNER -->|"data URL (~200KB)"| A1
    RUNNER -->|"解析結果 + クローゼット記述子JSON"| A2
    UI -->|アイテム写真| A3
    A1 --> SONNET
    A2 --> HAIKU
    A3 --> HAIKU
    A1 -.->|AI_GATEWAY_API_KEY なし| MOCK
    A1 -->|部分JSONテキストストリーム| RUNNER
    RUNNER -->|"検証済み結果を保存"| IDB
```

要点:

- **データの所有権は端末**。サーバは「画像/記述子を受け取りAIの部分JSONを中継する」だけで、何も保存しない
- **画面と解析の分離**: 解析は React コンポーネントでなくモジュールスコープのランナーが実行。画面遷移・アンマウントに影響されず完走し、UI は `useLiveQuery` (IndexedDB) と `useSyncExternalStore` (進行中の部分オブジェクト) で追従する
- **照合は画像を送らない**: クローゼットはテキスト記述子 (`ClosetDescriptor`) のみ送信し、高速・低コスト・低プライバシー露出にする

## シーケンス図 (パシャ → 解析 → 照合)

```mermaid
sequenceDiagram
    actor U as ユーザー
    participant C as カメラ画面 (/)
    participant I as lib/image.ts
    participant D as IndexedDB
    participant R as 解析ランナー
    participant S as /api/analyze · /api/match
    participant G as AI Gateway

    U->>C: シャッター (パシャ)
    C->>I: フレーム切出し + 縮小 (1024px JPEG)
    I->>D: snaps へ楽観的保存 (status: analyzing)
    C->>R: ensureSnapPipeline(snapId)
    C-->>U: 即 /snap/[id] へ遷移 (ブロックなし)
    R->>S: POST /api/analyze (data URL)
    S->>G: streamText + Output.object(SnapAnalysis)
    loop 部分JSONストリーム
        G-->>S: テキストチャンク
        S-->>R: チャンク中継
        R->>R: parsePartialJson → 部分オブジェクト更新
        R-->>U: 届いたセクションから逐次描画 (mood→配色→魅力…)
    end
    R->>R: Zod で最終検証 (snapAnalysisSchema)
    R->>D: analysis 保存 (status: done)
    alt クローゼットが1件以上
        R->>S: POST /api/match (解析結果 + 記述子)
        S->>G: streamText + Output.object(MatchPlan)
        G-->>R: 部分JSONストリーム (同様)
        R->>D: matchPlan 保存
        R-->>U: 再現コーデ3案 + 不足アイテム表示
    else クローゼット0件
        R-->>U: クローゼット登録CTAを表示
    end
```

## 技術スタックと選定理由

| 層 | 選定 | 理由 (詳細は ADR) |
|---|---|---|
| フレームワーク | Next.js 16 App Router | ワークスペース標準スターター。APIルートとPWAが1リポジトリで完結 |
| 永続化 | Dexie (IndexedDB) | [ADR-0002](adr/0002-local-first-indexeddb.md) — ローカルファースト |
| AIストリーミング | ai@6 `streamText+Output.object` / 自作 `fetch+parsePartialJson` | [ADR-0003](adr/0003-partial-json-streaming-custom-client.md) |
| AIモデル | AI Gateway 経由 Sonnet 5 / Haiku 4.5 の2モデル | [ADR-0004](adr/0004-two-model-strategy-ai-gateway.md) |
| バリデーション | Zod v4 (`lib/ai/schemas.ts` が唯一の原本) | AI出力・APIボディ・保存データの型を1本化 |
| UI | Tailwind v4、Shippori Mincho + Zen Kaku Gothic New | 常時ダークのエディトリアルトーン |

## レイヤ構造

```text
src/
├── app/                    # 画面 (4) + APIルート (3)
├── components/             # camera-capture / tab-nav / ui-bits
└── lib/
    ├── ai/
    │   ├── schemas.ts      # AI入出力の Zod スキーマ (唯一の原本)
    │   ├── prompts.ts      # system プロンプト + 表現ポリシー (断定禁止)
    │   ├── gateway.ts      # AI Gateway クライアント (DEFAULT_MODEL / FAST_MODEL)
    │   ├── client.ts       # 部分JSONストリーム消費 (fetch + parsePartialJson)
    │   └── mock.ts         # モック応答 + 擬似ストリーム
    ├── analysis-runner.ts  # 解析→照合パイプライン (画面非依存 singleton)
    ├── db/local.ts         # Dexie 層 (snaps / closetItems / 集計)
    ├── image.ts            # 縮小・サムネ・フレーム切出し
    └── env.ts              # 環境変数 Zod 検証 (唯一の窓口)
```

依存方向: `app → components → lib`、`lib/ai/schemas.ts` は全層から参照される型の原本。

## 認証・認可

なし (意図的)。ローカルファーストのため保護すべきサーバ側ユーザーデータが存在しない。
APIルートは入力検証 (Zod) のみ。公開サービス化する場合はレート制限を先に入れる。

## 外部サービス連携

Vercel AI Gateway のみ (`AI_GATEWAY_API_KEY`)。未設定時はモックに自動フォールバック。

## デプロイ構成

- Vercel (Fluid Compute)。APIルートは `maxDuration 60〜120s`
- カメラは HTTPS 必須のため、実機検証は preview デプロイ以降
- CI: GitHub Actions (`lint / typecheck / test / build`)
