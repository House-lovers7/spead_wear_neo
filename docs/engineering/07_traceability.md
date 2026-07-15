<!-- generated-by: scripts/generate_engineering_docs.py -->
# SPEAD WEAR - Shazam for Fashion Snap — 実装トレーサビリティ

> 生成日: 2026-07-15 / 対象: `spead_wear_neo` / 確度: [高]
> 実装・manifest・既存資料の静的棚卸しに基づく。外部サービスの稼働状態と本番構成は未検証。

## 根拠台帳

| 種別 | Path | 状態 |
|---|---|---|
| manifest | `package.json` | 静的確認済み |
| package/source | `package.json` | 静的確認済み |
| package/source | `src` | 静的確認済み |
| API | `src/app/api/analyze/route.ts` | 静的確認済み |
| API | `src/app/api/closet/categorize/route.ts` | 静的確認済み |
| API | `src/app/api/login/route.ts` | 静的確認済み |
| API | `src/app/api/match/route.ts` | 静的確認済み |
| UI | `src/app/page.tsx` | 静的確認済み |
| UI | `src/app/snaps/page.tsx` | 静的確認済み |
| UI | `src/app/snap/[id]/page.tsx` | 静的確認済み |
| UI | `src/app/closet/page.tsx` | 静的確認済み |
| UI | `src/app/login/page.tsx` | 静的確認済み |
| test | `vitest.config.ts` | 静的確認済み |
| test | `src/lib/__tests__/schemas.test.ts` | 静的確認済み |
| test | `src/lib/__tests__/ai-routes-security.test.ts` | 静的確認済み |
| test | `src/lib/__tests__/local-db.test.ts` | 静的確認済み |
| test | `src/lib/__tests__/safe-fetch.test.ts` | 静的確認済み |
| test | `src/lib/__tests__/prompts.test.ts` | 静的確認済み |
| test | `src/lib/__tests__/image.test.ts` | 静的確認済み |
| test | `src/lib/__tests__/result.test.ts` | 静的確認済み |
| test | `src/lib/__tests__/distributed-quota.test.ts` | 静的確認済み |
| test | `src/lib/__tests__/demo-gate.test.ts` | 静的確認済み |
| test | `src/lib/__tests__/bounded-json.test.ts` | 静的確認済み |
| test | `src/lib/__tests__/proxy-security.test.ts` | 静的確認済み |
| test | `src/lib/__tests__/ai-request-guard.test.ts` | 静的確認済み |
| quality/CI | `tsconfig.json` | 静的確認済み |
| quality/CI | `biome.json` | 静的確認済み |
| quality/CI | `vitest.config.ts` | 静的確認済み |
| quality/CI | `.github/workflows/ci.yml` | 静的確認済み |
| existing docs | `README.md` | 静的確認済み |
| existing docs | `docs/05_api_design.md` | 静的確認済み |
| existing docs | `docs/04_er_diagram.md` | 静的確認済み |
| existing docs | `docs/02_requirements.md` | 静的確認済み |
| existing docs | `docs/01_concept.md` | 静的確認済み |
| existing docs | `docs/03_architecture.md` | 静的確認済み |
| existing docs | `docs/adr/0001-record-architecture-decisions.md` | 静的確認済み |
| existing docs | `docs/adr/0006-distributed-ai-quota.md` | 静的確認済み |
| existing docs | `docs/adr/0003-partial-json-streaming-custom-client.md` | 静的確認済み |
| existing docs | `docs/adr/0005-demo-passcode-gate.md` | 静的確認済み |
| existing docs | `docs/adr/0002-local-first-indexeddb.md` | 静的確認済み |
| existing docs | `docs/adr/0004-two-model-strategy-ai-gateway.md` | 静的確認済み |

## 検出した検証command

- **dev**: `npm run dev  # next dev`
- **start**: `npm run start  # next start`
- **build**: `npm run build  # next build`
- **typecheck**: `npm run typecheck  # tsc --noEmit`
- **lint**: `npm run lint  # biome check .`
- **test**: `npm run test  # vitest run`
- **format**: `npm run format  # biome format --write .`

## 設定契約（名前のみ）

- `APP_URL` — `env.example`
- `NODE_ENV` — `next.config.ts`

値、credential、顧客データは収集していない。設定のrequired/optional、format、取得元は各entrypointとruntimeで確認する。

## 既存文書との関係

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

既存ADR・公式schema・運用runbookがある場合はそれらを正典とし、generated docsは発見用索引として扱う。矛盾を見つけたら実装・正式文書・生成器のどれを直すかをreviewで決める。

## 未確認事項

- 動的route/schema/plugin、external gateway、mobile native設定。
- secret manager、provider console、production runtimeの値と適用version。
- migration適用状態、SLO実績、実データ量、owner/on-call。

## 更新ルール

- route/schema/screen/runtime構成を変更した差分では、対応する文書を同時更新する。
- 生成し直す前に手書き文書を正典へ昇格するか、生成対象外へ分離する。
- このディレクトリの `generated-by` marker付きファイルは本スクリプトで再生成できる。
