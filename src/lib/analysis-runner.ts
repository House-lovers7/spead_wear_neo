"use client";

import { useEffect, useSyncExternalStore } from "react";
import { streamJsonObject } from "@/lib/ai/client";
import {
  type MatchPlan,
  matchPlanSchema,
  type SnapAnalysis,
  snapAnalysisSchema,
} from "@/lib/ai/schemas";
import {
  db,
  markSnapError,
  saveSnapAnalysis,
  saveSnapMatchPlan,
  toClosetDescriptor,
} from "@/lib/db/local";
import { blobToDataUrl } from "@/lib/image";

/**
 * スナップ解析パイプライン (解析 → 手持ち照合) のバックグラウンドランナー。
 *
 * モジュールスコープの singleton として動くため、シャッター直後に開始でき、
 * ユーザーが画面を離れても完走して IndexedDB に書き込む。
 * 進行中の部分オブジェクトはメモリ上のストアに置き、useSnapPipeline で購読する。
 */

/** ストリーミング途中はネストも配列要素も欠けうる。UI は undefined を許容して描画する。 */
export type DeepPartial<T> = T extends (infer U)[]
  ? DeepPartial<U>[]
  : T extends object
    ? { [K in keyof T]?: DeepPartial<T[K]> }
    : T;

export type PartialAnalysis = DeepPartial<SnapAnalysis>;
export type PartialMatch = DeepPartial<MatchPlan>;

export interface PipelineState {
  partialAnalysis?: PartialAnalysis | undefined;
  partialMatch?: PartialMatch | undefined;
  analysisError?: string | undefined;
  matchError?: string | undefined;
  matchRunning: boolean;
}

const EMPTY_STATE: PipelineState = { matchRunning: false };

const states = new Map<string, PipelineState>();
const listeners = new Map<string, Set<() => void>>();
const runningSnapIds = new Set<string>();

function setState(snapId: string, patch: Partial<PipelineState>): void {
  const prev = states.get(snapId) ?? EMPTY_STATE;
  states.set(snapId, { ...prev, ...patch });
  for (const notify of listeners.get(snapId) ?? []) notify();
}

function subscribe(snapId: string, notify: () => void): () => void {
  const set = listeners.get(snapId) ?? new Set();
  set.add(notify);
  listeners.set(snapId, set);
  return () => {
    set.delete(notify);
  };
}

/** 解析パイプラインを開始する (既に走っていれば no-op)。 */
export function ensureSnapPipeline(snapId: string): void {
  if (runningSnapIds.has(snapId)) return;
  runningSnapIds.add(snapId);
  void runPipeline(snapId).finally(() => {
    runningSnapIds.delete(snapId);
  });
}

/** クローゼット更新後などに照合だけやり直す。 */
export function rerunMatch(snapId: string): void {
  ensureSnapPipeline(snapId);
}

async function runPipeline(snapId: string): Promise<void> {
  const snap = await db.snaps.get(snapId);
  if (!snap) return;

  // --- ステップ1: スナップ分解 ---
  let analysis = snap.analysis;
  if (!analysis) {
    try {
      const image = await blobToDataUrl(snap.imageBlob);
      const raw = await streamJsonObject("/api/analyze", { image }, (partial) => {
        setState(snapId, { partialAnalysis: partial as PartialAnalysis, analysisError: undefined });
      });
      analysis = snapAnalysisSchema.parse(raw);
      await saveSnapAnalysis(snapId, analysis);
    } catch (error) {
      await markSnapError(snapId);
      setState(snapId, {
        analysisError: error instanceof Error ? error.message : "解析に失敗しました",
      });
      return;
    }
  }

  // --- ステップ2: 手持ち服との照合 (クローゼットが空ならスキップ) ---
  const closetItems = await db.closetItems.toArray();
  if (closetItems.length === 0) return;

  const fresh = await db.snaps.get(snapId);
  if (fresh?.matchPlan && fresh.matchedClosetCount === closetItems.length) return;

  setState(snapId, { matchRunning: true, matchError: undefined, partialMatch: undefined });
  try {
    const raw = await streamJsonObject(
      "/api/match",
      { analysis, closet: closetItems.map(toClosetDescriptor) },
      (partial) => {
        setState(snapId, { partialMatch: partial as PartialMatch });
      },
    );
    const plan = matchPlanSchema.parse(raw);
    await saveSnapMatchPlan(snapId, plan, closetItems.length);
    setState(snapId, { matchRunning: false });
  } catch (error) {
    setState(snapId, {
      matchRunning: false,
      matchError: error instanceof Error ? error.message : "照合に失敗しました",
    });
  }
}

/** スナップ詳細画面用フック: パイプラインを起動しつつ進行状態を購読する。 */
export function useSnapPipeline(snapId: string): PipelineState {
  useEffect(() => {
    ensureSnapPipeline(snapId);
  }, [snapId]);

  return useSyncExternalStore(
    (notify) => subscribe(snapId, notify),
    () => states.get(snapId) ?? EMPTY_STATE,
    () => EMPTY_STATE,
  );
}
