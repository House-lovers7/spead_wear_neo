"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { Camera } from "lucide-react";
import Link from "next/link";
import { Chip } from "@/components/ui-bits";
import { aggregateLikedPoints, db, type SnapRecord } from "@/lib/db/local";
import { useObjectUrl } from "@/lib/use-object-url";

/**
 * 保存スナップの一覧 + 好みプロファイル。
 * 「いいね」で終わらせず、タップした好きポイントの蓄積を
 * 「自分はこういうバランスが好き」という言葉に変えて返す。
 */
export default function SnapsPage() {
  const snaps = useLiveQuery(() => db.snaps.orderBy("createdAt").reverse().toArray(), []);

  const likedProfile = aggregateLikedPoints(snaps ?? []);
  const tasteProfile = aggregateTaste(snaps ?? []);

  return (
    <main id="main" className="min-h-dvh px-5 pb-28 pt-safe">
      <header className="pt-6">
        <p className="eyebrow">Library</p>
        <h1 className="font-display mt-1 text-2xl font-semibold tracking-wide">スナップ</h1>
      </header>

      {/* 好みプロファイル */}
      {(likedProfile.length > 0 || tasteProfile.length > 0) && (
        <section className="mt-6 rounded-xl border border-border bg-card/60 p-4">
          <p className="eyebrow">Your Taste</p>
          <h2 className="font-display mt-1 text-base font-semibold">あなたの好みの傾向</h2>
          {likedProfile.length > 0 && (
            <div className="mt-3">
              <p className="text-xs text-muted-foreground">よくタップする「好き」</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {likedProfile.slice(0, 8).map(({ label, count }) => (
                  <Chip key={label} active>
                    {label}
                    {count > 1 && <span className="opacity-70">×{count}</span>}
                  </Chip>
                ))}
              </div>
            </div>
          )}
          {tasteProfile.length > 0 && (
            <div className="mt-3">
              <p className="text-xs text-muted-foreground">保存したスナップのテイスト</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {tasteProfile.slice(0, 6).map(({ label, count }) => (
                  <Chip key={label}>
                    {label}
                    {count > 1 && <span className="opacity-70">×{count}</span>}
                  </Chip>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* スナップグリッド */}
      {snaps && snaps.length === 0 ? (
        <div className="mt-16 text-center">
          <p className="font-display text-lg">まだスナップがありません</p>
          <p className="mx-auto mt-2 max-w-[16rem] text-sm leading-relaxed text-muted-foreground">
            気になったコーデを撮ると、ここに「好き」が貯まっていきます。
          </p>
          <Link
            href="/"
            className="mt-5 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground"
          >
            <Camera size={16} aria-hidden />
            撮りに行く
          </Link>
        </div>
      ) : (
        <ul className="mt-6 grid grid-cols-2 gap-3">
          {snaps?.map((snap) => (
            <li key={snap.id}>
              <SnapCard snap={snap} />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

function SnapCard({ snap }: { snap: SnapRecord }) {
  const url = useObjectUrl(snap.thumbBlob);
  return (
    <Link href={`/snap/${snap.id}`} className="block">
      <div className="relative overflow-hidden rounded-xl border border-border">
        {url ? (
          // biome-ignore lint/performance/noImgElement: IndexedDB Blob の object URL は next/image 非対応
          <img src={url} alt="保存したスナップ" className="aspect-[3/4] w-full object-cover" />
        ) : (
          <div className="shimmer aspect-[3/4] w-full" />
        )}
        {snap.status === "analyzing" && (
          <span className="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-black/55 px-2 py-0.5 text-[0.6rem] text-white backdrop-blur-sm">
            <span className="h-1 w-1 animate-pulse rounded-full bg-primary" aria-hidden />
            解析中
          </span>
        )}
        {snap.likedPoints.length > 0 && (
          <span className="absolute left-2 top-2 rounded-full bg-black/55 px-2 py-0.5 text-[0.6rem] text-primary backdrop-blur-sm">
            ♥ {snap.likedPoints.length}
          </span>
        )}
      </div>
      <p className="mt-1.5 line-clamp-2 text-xs leading-snug text-foreground/85">
        {snap.analysis?.mood ?? "解析待ち"}
      </p>
      <p className="mt-0.5 text-[0.6rem] text-muted-foreground">
        {new Date(snap.createdAt).toLocaleDateString("ja-JP")}
      </p>
    </Link>
  );
}

function aggregateTaste(snaps: SnapRecord[]): { label: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const snap of snaps) {
    for (const taste of snap.analysis?.taste ?? []) {
      counts.set(taste, (counts.get(taste) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, "ja"));
}
