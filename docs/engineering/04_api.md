<!-- generated-by: scripts/generate_engineering_docs.py -->
# SPEAD WEAR - Shazam for Fashion Snap — API定義書

> 生成日: 2026-07-15 / 対象: `spead_wear_neo` / 確度: [高]
> 実装・manifest・既存資料の静的棚卸しに基づく。外部サービスの稼働状態と本番構成は未検証。

## 正典とこの文書の関係

> [高] API契約の正典は `docs/05_api_design.md`。以下の自動検出台帳は実装探索と差分発見の補助であり、別の契約正典として扱わない。

- 正典から抽出: 4 method/path
- 実装から静的検出: 4 method/path
- 正典のみ: なし
- 実装検出のみ: なし
- 差分がある場合は、正典を先に読み、route登録・mount/prefix・動的生成を確認してから更新する。


## Public interface inventory

- CLI/script: CLI script未検出
- entrypoint: entrypoint未検出
- HTTP endpoints: 4

## 検出したAPI

| Method | Path | Purpose signal | Auth signal | Input signal | Response status signal | Implementation |
|---|---|---|---|---|---|---|
| `POST` | `/api/analyze` | POST analyze | 未確認 | createTextStreamResponse, guardAiRequest, imageRequestSchema, snapAnalysisSchema | 502 | `src/app/api/analyze/route.ts` |
| `POST` | `/api/closet/categorize` | POST closet / categorize | 未確認 | createTextStreamResponse, guardAiRequest, closetItemAttrsSchema, imageRequestSchema | 502 | `src/app/api/closet/categorize/route.ts` |
| `POST` | `/api/login` | POST login | 未確認 | NextResponse, bodySchema | 503, 400, 401 | `src/app/api/login/route.ts` |
| `POST` | `/api/match` | POST match | 未確認 | createTextStreamResponse, guardAiRequest, matchPlanSchema, matchRequestSchema | 502 | `src/app/api/match/route.ts` |

## API所有境界

- `src/app/api/analyze`
- `src/app/api/closet/categorize`
- `src/app/api/login`
- `src/app/api/match`

## 実装から確認できた追加契約

- `src/app/api/login/route.ts`: request上限=z.object({ passcode: z.string().min(1).max(128) });

## CLI契約

- argparse/commander等のsubcommand・exit-code契約は静的検出できず。

## 変更時の実務チェック

- caller: src/app/page.tsx, src/app/snaps/page.tsx, src/app/snap/[id]/page.tsx, src/app/closet/page.tsx, src/app/login/page.tsx
- schema: route内inline validationだけでなく共有schema・型・OpenAPIの有無を確認する。
- auth: `未確認` のendpointは公開を意味しない。middleware、gateway、provider側設定も確認する。
- error: 表中にstatus signalがないhandlerは、成功/入力/権限/依存障害の契約をtestで固定する。
- write: POST/PUT/PATCH/DELETEは冪等性、重複retry、監査ログ、rollbackを確認する。

## 未確認

- 動的に登録されるroute、gateway rewrite、provider callback、production側rate limit。
- request/responseの完全なfield定義は、表の実装pathと共有schemaを正典として確認する。
