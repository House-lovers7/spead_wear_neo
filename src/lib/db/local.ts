import Dexie, { type EntityTable } from "dexie";
import type { ClosetDescriptor, ClosetItemAttrs, MatchPlan, SnapAnalysis } from "@/lib/ai/schemas";

/**
 * ローカルファーストの永続化層 (IndexedDB / Dexie)。
 * 画像は Blob のまま保存する (base64 化しない — サイズ 1.33 倍化と GC 負荷を避ける)。
 *
 * シャッター直後に `status: "analyzing"` で楽観的保存し、解析完了時に
 * analysis を書き足す。UI は dexie-react-hooks の useLiveQuery で自動追従する。
 */

export type SnapStatus = "analyzing" | "done" | "error";

export interface SnapRecord {
  id: string;
  createdAt: number;
  /** 送信用に縮小済みの JPEG (長辺 1024px)。 */
  imageBlob: Blob;
  /** 一覧グリッド用サムネイル (長辺 320px)。 */
  thumbBlob: Blob;
  status: SnapStatus;
  analysis?: SnapAnalysis;
  /** ユーザーが「ここが好き」と選んだラベル。好みプロファイルの原資。 */
  likedPoints: string[];
  matchPlan?: MatchPlan;
  /** matchPlan 生成時のクローゼット件数 (再照合の要否判定に使う)。 */
  matchedClosetCount?: number;
}

export interface ClosetItemRecord extends ClosetItemAttrs {
  id: string;
  createdAt: number;
  imageBlob: Blob;
  thumbBlob: Blob;
  note?: string;
}

export const db = new Dexie("spead_wear_neo") as Dexie & {
  snaps: EntityTable<SnapRecord, "id">;
  closetItems: EntityTable<ClosetItemRecord, "id">;
};

db.version(1).stores({
  // Blob や analysis はインデックス不要なので列挙しない (Dexie はインデックス定義のみ書く)
  snaps: "id, createdAt, status",
  closetItems: "id, createdAt, category",
});

export function newId(): string {
  return crypto.randomUUID();
}

/** シャッター直後の楽観的保存。以降の画面は id だけ持って遷移する。 */
export async function createSnap(imageBlob: Blob, thumbBlob: Blob): Promise<string> {
  const id = newId();
  await db.snaps.add({
    id,
    createdAt: Date.now(),
    imageBlob,
    thumbBlob,
    status: "analyzing",
    likedPoints: [],
  });
  return id;
}

export async function saveSnapAnalysis(id: string, analysis: SnapAnalysis): Promise<void> {
  await db.snaps.update(id, { analysis, status: "done" });
}

export async function markSnapError(id: string): Promise<void> {
  await db.snaps.update(id, { status: "error" });
}

export async function saveSnapMatchPlan(
  id: string,
  matchPlan: MatchPlan,
  matchedClosetCount: number,
): Promise<void> {
  await db.snaps.update(id, { matchPlan, matchedClosetCount });
}

export async function toggleLikedPoint(id: string, label: string): Promise<void> {
  const snap = await db.snaps.get(id);
  if (!snap) return;
  const likedPoints = snap.likedPoints.includes(label)
    ? snap.likedPoints.filter((p) => p !== label)
    : [...snap.likedPoints, label];
  await db.snaps.update(id, { likedPoints });
}

export async function addClosetItem(
  attrs: ClosetItemAttrs,
  imageBlob: Blob,
  thumbBlob: Blob,
): Promise<string> {
  const id = newId();
  await db.closetItems.add({
    ...attrs,
    id,
    createdAt: Date.now(),
    imageBlob,
    thumbBlob,
  });
  return id;
}

/** 照合 API に送る軽量記述子 (画像を含めない)。 */
export function toClosetDescriptor(item: ClosetItemRecord): ClosetDescriptor {
  return {
    id: item.id,
    category: item.category,
    name: item.name,
    colors: item.colors,
    silhouette: item.silhouette,
    taste: item.taste,
    seasons: item.seasons,
    formality: item.formality,
  };
}

/** 好みプロファイル: likedPoints を集計して頻度順に返す。 */
export function aggregateLikedPoints(snaps: Pick<SnapRecord, "likedPoints">[]): {
  label: string;
  count: number;
}[] {
  const counts = new Map<string, number>();
  for (const snap of snaps) {
    for (const label of snap.likedPoints) {
      counts.set(label, (counts.get(label) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, "ja"));
}
