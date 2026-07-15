<!-- generated-by: scripts/generate_engineering_docs.py -->
# SPEAD WEAR - Shazam for Fashion Snap — 非機能要件・SLO/SLI

> 生成日: 2026-07-15 / 対象: `spead_wear_neo` / 確度: [高]
> 実装・manifest・既存資料の静的棚卸しに基づく。外部サービスの稼働状態と本番構成は未検証。

## 現在コード化されている品質ゲート

| Gate | Command | 根拠 |
|---|---|---|
| dev | `npm run dev  # next dev` | manifest script |
| start | `npm run start  # next start` | manifest script |
| build | `npm run build  # next build` | manifest script |
| typecheck | `npm run typecheck  # tsc --noEmit` | manifest script |
| lint | `npm run lint  # biome check .` | manifest script |
| test | `npm run test  # vitest run` | manifest script |
| format | `npm run format  # biome format --write .` | manifest script |

- test files: 13（`vitest.config.ts`, `src/lib/__tests__/schemas.test.ts`, `src/lib/__tests__/ai-routes-security.test.ts`, `src/lib/__tests__/local-db.test.ts`, `src/lib/__tests__/safe-fetch.test.ts`, `src/lib/__tests__/prompts.test.ts`, `src/lib/__tests__/image.test.ts`, `src/lib/__tests__/result.test.ts`, `src/lib/__tests__/distributed-quota.test.ts`, `src/lib/__tests__/demo-gate.test.ts`, `src/lib/__tests__/bounded-json.test.ts`, `src/lib/__tests__/proxy-security.test.ts`, `src/lib/__tests__/ai-request-guard.test.ts`）
- quality/CI config: `tsconfig.json`, `biome.json`, `vitest.config.ts`, `.github/workflows/ci.yml`
- security/resilience signal: resilience (`src/app/api/match/route.ts`), resilience (`src/app/api/analyze/route.ts`), resilience (`src/app/api/closet/categorize/route.ts`), auth/session (`src/lib/__tests__/ai-routes-security.test.ts`), rate-limit (`src/lib/__tests__/ai-routes-security.test.ts`), resilience (`src/lib/__tests__/ai-routes-security.test.ts`), auth/session (`src/lib/__tests__/distributed-quota.test.ts`), resilience (`src/lib/__tests__/distributed-quota.test.ts`), auth/session (`src/lib/ai/distributed-quota.ts`), resilience (`src/lib/ai/distributed-quota.ts`), rate-limit (`src/lib/ai/request-guard.ts`), resilience (`src/lib/ai/request-guard.ts`), resilience (`src/lib/ai/client.ts`)

## 計測すべきSLI

| Boundary | SLI | 最初の計測根拠 |
|---|---|---|
| API | 主要endpointの成功率・p95 latency・5xx率 | `src/app/api/analyze/route.ts` |
| UI | 主要導線完了率・client error・表示時間 | `src/app/page.tsx` |

## SLOの状態

[高] 合意済みSLO数値はrepository内の実装・資料から確認できていない。任意の99%や2秒を現在要件として記載しない。利用者、運用時間帯、障害コスト、予算を確認してから、上記SLIごとにtarget/window/error budgetを決める。

## 運用境界

- runtime/config: config (`.github/workflows/ci.yml`), environment_variable_names (`env.example`)
- required config names: APP_URL, NODE_ENV
- 外部integration: 静的検出なし
- rollbackはcode、schema、generated artifact、provider設定を分ける。production操作は人間承認後に行う。
