<!-- generated-by: scripts/generate_engineering_docs.py -->
# SPEAD WEAR - Shazam for Fashion Snap — Engineering Handbook / Start Here

> 生成日: 2026-07-15 / 対象: `spead_wear_neo` / 確度: [高]
> 実装・manifest・既存資料の静的棚卸しに基づく。外部サービスの稼働状態と本番構成は未検証。

## 60分で把握する

1. コンセプト: 気になったコーデをパシャ→AIが魅力を分解(何が良いのか言語化)→好きポイントをタップ蓄積→手持ち服で再現案3→優先度つき不足アイテム+買わなくていいもの、を1画面で返すスナップ翻訳PWA。画像検索でもコーデ提案でもなく「憧れを実行可能な服選びと購買判断に変換」が芯。無駄買い防止に直結
2. classification: `active_project` / stack: Next.js 16.2.6, React 19.2.4, TypeScript ^5, Tailwind CSS ^4, Vercel AI SDK 6.0.184, Node.js
3. install: `pnpm install --frozen-lockfile`
4. run/check: `npm run dev  # next dev`, `npm run start  # next start`, `npm run build  # next build`, `npm run typecheck  # tsc --noEmit`, `npm run lint  # biome check .`
5. entrypoint: entrypoint未検出

## 実装スナップショット

| 項目 | 現在値 | 最初に読むpath |
|---|---:|---|
| package/component | 2 | `.` |
| API | 4 | `src/app/api/analyze/route.ts` |
| entity | 0 | 未検出 |
| screen/entry UI | 5 | `src/app/page.tsx` |
| test files | 13 | `vitest.config.ts` |

## 最初に確認する既存の正典候補

- `README.md`
- `docs/05_api_design.md`
- `docs/04_er_diagram.md`
- `docs/02_requirements.md`
- `docs/01_concept.md`
- `docs/03_architecture.md`
- `docs/adr/0001-record-architecture-decisions.md`
- `docs/adr/0006-distributed-ai-quota.md`
- `docs/adr/0003-partial-json-streaming-custom-client.md`
- `docs/adr/0005-demo-passcode-gate.md`
- `docs/adr/0002-local-first-indexeddb.md`
- `docs/adr/0004-two-model-strategy-ai-gateway.md`

既存ADR、OpenAPI、schema、運用runbookがある場合は、下記generated docsより先に読む。

## 引継ぎblocking / partial

| Priority | Requirement | 状態・理由 | Evidence |
|---|---|---|---|
| P1 | `infrastructure_services_and_environment_names` | partial: configはあるが、service接続、runtime/region、resource、env必須性・秘密区分、環境差分が不足。 | `.github/workflows/ci.yml` |
| P1 | `rollback` | partial: rollback言及はあるが、trigger、担当、command、schema/data互換、検証、停止条件が不足。 | `docs/adr/0002-local-first-indexeddb.md` |

## 読む順番

1. [One Pager](./00_one_pager.md)
2. [技術スタック比較](./01_stack_comparison.md)
3. [アーキテクチャ・システム構成](./02_architecture.md)
4. [ADR](./03_adrs/ADR-0001-current-implementation-baseline.md)
5. [API定義](./04_api.md)
6. [データモデル・ER図](./05_data_model.md)
7. [非機能要件・SLO/SLI](./05_nfr_slo.md)
8. [画面設計](./06_screen_design.md)
9. [P50/P90見積り](./06_estimation.md)
10. [実装トレーサビリティ](./07_traceability.md)
11. [学習・保守ロードマップ](./08_learning_roadmap.md)

## 使い方

- generated docsは実装発見用handbook。既存ADR、OpenAPI、schema、runbookがある場合は既存正典を優先する。
- path・数・versionは静的検出した事実。目的やpath由来の責務は `[中]` の推定を含む。
- production、external console、secret値、migration適用状態は未確認。
