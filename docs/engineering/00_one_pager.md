<!-- generated-by: scripts/generate_engineering_docs.py -->
# SPEAD WEAR - Shazam for Fashion Snap — One Pager / オンボーディング概要

> 生成日: 2026-07-15 / 対象: `spead_wear_neo` / 確度: [高]
> 実装・manifest・既存資料の静的棚卸しに基づく。外部サービスの稼働状態と本番構成は未検証。

## コンセプト

気になったコーデをパシャ→AIが魅力を分解(何が良いのか言語化)→好きポイントをタップ蓄積→手持ち服で再現案3→優先度つき不足アイテム+買わなくていいもの、を1画面で返すスナップ翻訳PWA。画像検索でもコーデ提案でもなく「憧れを実行可能な服選びと購買判断に変換」が芯。無駄買い防止に直結

## 誰の何を解くか

- 対象領域: 生活/健康/学習/個人支援
- 想定利用者: 服選びを時短したい・買い物の失敗を減らしたい一般ユーザー。特にファッションアプリを使わない男性の時短・失敗回避層
- 価値仮説: getUserMediaビューファインダーで撮影→canvasで長辺1024px縮小→IndexedDBへ楽観的保存→/api/analyzeがstreamText+Output.objectで部分JSONストリーム→クライアントはparsePartialJsonで逐次描画(モジュールスコープランナーが画面遷移に耐えて完走)→解析完了後クローゼットのテキスト記述子だけで/api/match照合。画像・好み・服データは全てローカル(サーバDBなし)。キー未設定時はモックで全フロー動作

## 現在地

| 項目 | 観測結果 |
|---|---|
| 技術スタック | Next.js, React, TypeScript, Tailwind CSS, Vercel AI SDK, Node.js |
| API | 4 endpoint signal |
| データモデル | 0 unique entity signal |
| 画面 | 5 route/screen signal |
| 実行基盤 | config (`.github/workflows/ci.yml`), environment_variable_names (`env.example`) |
| package / module | 2 component signal |
| tests | 13 file signal |

## ソースマップ

| Component | Path | 責務 |
|---|---|---|
| `spead_wear_neo` | `.` | 責務は実装と既存READMEを確認 |
| `src` | `src` | 中核実装。詳細は配下moduleを参照 |

## 最初に使うコマンド

| 目的 | Command |
|---|---|
| `dev` | `npm run dev  # next dev` |
| `start` | `npm run start  # next start` |
| `build` | `npm run build  # next build` |
| `typecheck` | `npm run typecheck  # tsc --noEmit` |
| `lint` | `npm run lint  # biome check .` |
| `test` | `npm run test  # vitest run` |
| `format` | `npm run format  # biome format --write .` |

## 変更箇所の入口

| 変更対象 | 最初に読むpath | 同時に確認するもの |
|---|---|---|
| 画面・導線 | `src/app/page.tsx` | 関連API、認可、loading/error状態 |
| API・業務処理 | `src/app/api/analyze/route.ts` | request/response schema、呼出元、外部依存 |
| 実行・配備 | `.github/workflows/ci.yml` | 環境変数、service依存、rollback |
| 回帰検査 | `vitest.config.ts` | 変更対象に近いtestと全体check |

## 引継ぎ時の未解決ギャップ

| Priority | Requirement | 状態・理由 | Evidence |
|---|---|---|---|
| P1 | `infrastructure_services_and_environment_names` | partial: configはあるが、service接続、runtime/region、resource、env必須性・秘密区分、環境差分が不足。 | `.github/workflows/ci.yml` |
| P1 | `rollback` | partial: rollback言及はあるが、trigger、担当、command、schema/data互換、検証、停止条件が不足。 | `docs/adr/0002-local-first-indexeddb.md` |

## スコープ境界

- [高] productionの稼働、外部provider設定、secret値は未確認。
- [高] API・DB・画面が未検出の場合は推測せず、実装入口の追加を課題として残す。
- [中] 初回変更前に `07_traceability.md` の根拠と未確認事項を確認する。
