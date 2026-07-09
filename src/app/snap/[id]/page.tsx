"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { ChevronLeft, Heart, RefreshCw, Shirt } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Chip, DotScale, Section, SkeletonLines } from "@/components/ui-bits";
import {
  ensureSnapPipeline,
  type PartialAnalysis,
  type PartialMatch,
  useSnapPipeline,
} from "@/lib/analysis-runner";
import { db, toggleLikedPoint } from "@/lib/db/local";
import { useObjectUrl } from "@/lib/use-object-url";
import { cn } from "@/lib/utils";

/**
 * コアUXの1画面: スナップの分解 → 好きポイント保存 → 手持ち再現 → 買うべきもの。
 * 解析はバックグラウンドで進み、届いたセクションから順に rise-in で現れる。
 */
export default function SnapDetailPage() {
  const { id } = useParams<{ id: string }>();
  // undefined = 読込中 / null = 存在しない
  const snap = useLiveQuery(async () => (await db.snaps.get(id)) ?? null, [id]);
  const closetItems = useLiveQuery(() => db.closetItems.toArray(), []);
  const pipeline = useSnapPipeline(id);

  const imageUrl = useObjectUrl(snap?.imageBlob);

  if (snap === undefined) {
    return <main id="main" className="min-h-dvh" />; // Dexie 読込中 (一瞬)
  }
  if (snap === null) {
    return (
      <main id="main" className="flex min-h-dvh flex-col items-center justify-center gap-4 px-8">
        <p className="text-sm text-muted-foreground">このスナップは見つかりませんでした。</p>
        <Link href="/" className="text-sm text-primary underline underline-offset-4">
          カメラに戻る
        </Link>
      </main>
    );
  }

  // 確定データ優先、ストリーミング中は部分オブジェクトで描画
  const analysis: PartialAnalysis | undefined = snap.analysis ?? pipeline.partialAnalysis;
  const match: PartialMatch | undefined = snap.matchPlan ?? pipeline.partialMatch;
  const analyzing = snap.status === "analyzing" && !snap.analysis;
  const closetCount = closetItems?.length ?? 0;

  return (
    <main id="main" className="min-h-dvh pb-28">
      {/* ヒーロー画像 */}
      <div className="relative">
        <div className="pt-safe absolute inset-x-0 top-0 z-10 flex items-center justify-between bg-gradient-to-b from-black/60 to-transparent px-3 pb-8 pt-3">
          <Link
            href="/"
            aria-label="カメラに戻る"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm"
          >
            <ChevronLeft size={20} aria-hidden />
          </Link>
          <StatusBadge analyzing={analyzing} error={snap.status === "error"} />
        </div>
        {imageUrl ? (
          // biome-ignore lint/performance/noImgElement: IndexedDB Blob の object URL は next/image 非対応
          <img
            src={imageUrl}
            alt="解析対象のファッションスナップ"
            className="max-h-[62vh] w-full object-cover"
          />
        ) : (
          <div className="shimmer h-[50vh] w-full" />
        )}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-background to-transparent" />
      </div>

      {/* 解析エラー */}
      {snap.status === "error" && (
        <div className="mx-5 mt-4 rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm">
          <p>{pipeline.analysisError ?? "解析に失敗しました。"}</p>
          <button
            type="button"
            onClick={() => {
              // 状態を戻してからパイプラインを再走させる
              void db.snaps.update(id, { status: "analyzing" }).then(() => ensureSnapPipeline(id));
            }}
            className="mt-3 inline-flex items-center gap-2 rounded-full border border-border px-4 py-1.5 text-xs"
          >
            <RefreshCw size={13} aria-hidden />
            もう一度解析する
          </button>
        </div>
      )}

      {/* MOOD — 最初に届く一文 */}
      <div className="rise-in px-5 pt-5">
        <p className="eyebrow">Mood</p>
        {analysis?.mood ? (
          <p className="font-display mt-2 text-xl font-semibold leading-relaxed">{analysis.mood}</p>
        ) : (
          <SkeletonLines lines={2} className="mt-3" />
        )}
        {(analysis?.taste || analysis?.silhouette) && (
          <div className="mt-3 flex flex-wrap gap-2">
            {analysis.taste?.filter(Boolean).map((t) => (
              <Chip key={t}>{t}</Chip>
            ))}
            {analysis.silhouette && <Chip>{analysis.silhouette}</Chip>}
            {analysis.season && <Chip>{analysis.season}</Chip>}
          </div>
        )}
        {typeof analysis?.formality === "number" && (
          <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
            フォーマル度 <DotScale value={analysis.formality} label="フォーマル度" />
          </div>
        )}
      </div>

      {/* PALETTE */}
      {analysis?.colorPalette && (
        <Section eyebrow="Palette" title="配色">
          <div className="flex gap-3">
            {analysis.colorPalette.colors?.filter(Boolean).map((c) => (
              <div key={`${c?.name}-${c?.hex}`} className="flex flex-col items-center gap-1.5">
                <span
                  className="h-11 w-11 rounded-full border border-border shadow-inner"
                  style={{ backgroundColor: c?.hex ?? "#444" }}
                  aria-hidden
                />
                <span className="text-[0.65rem] text-muted-foreground">{c?.name}</span>
              </div>
            ))}
          </div>
          {analysis.colorPalette.tone && (
            <p className="mt-3 text-sm leading-relaxed text-foreground/85">
              {analysis.colorPalette.tone}
            </p>
          )}
          {analysis.colorPalette.contrast && (
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
              {analysis.colorPalette.contrast}
            </p>
          )}
        </Section>
      )}

      {/* KEY ITEMS */}
      {!!analysis?.keyItems?.length && (
        <Section eyebrow="Key Items" title="構成アイテム">
          <ul className="space-y-2.5">
            {analysis.keyItems.filter(Boolean).map((item, i) => (
              <li
                key={`${item?.name ?? i}`}
                className="flex items-start justify-between gap-3 rounded-lg border border-border bg-card/60 px-4 py-3"
              >
                <div>
                  <p className="text-sm font-medium leading-snug">{item?.name}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {item?.category}
                    {item?.color ? ` ・ ${item.color}` : ""}
                  </p>
                </div>
                {item?.role === "hero" && (
                  <span className="eyebrow shrink-0 rounded-full border border-primary/50 px-2 py-1 !text-[0.55rem]">
                    主役
                  </span>
                )}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* APPEAL — 好きポイント保存 */}
      {(analyzing || !!analysis?.appealPoints?.length) && (
        <Section eyebrow="Why It Works" title="このコーデの、何が良いのか">
          <p className="-mt-2 mb-4 text-xs text-muted-foreground">
            共感したところをタップすると「好み」として蓄積されます
          </p>
          {analysis?.appealPoints?.length ? (
            <ul className="space-y-2.5">
              {analysis.appealPoints.filter(Boolean).map((point, i) => {
                const label = point?.label ?? "";
                const liked = !!label && snap.likedPoints.includes(label);
                return (
                  <li key={label || i}>
                    <button
                      type="button"
                      disabled={!label}
                      onClick={() => label && toggleLikedPoint(id, label)}
                      className={cn(
                        "w-full rounded-lg border px-4 py-3 text-left transition-colors",
                        liked
                          ? "border-primary/60 bg-primary/10"
                          : "border-border bg-card/60 active:bg-secondary",
                      )}
                    >
                      <span className="flex items-center justify-between gap-3">
                        <span className={cn("text-sm font-medium", liked && "text-primary")}>
                          {label}
                        </span>
                        <Heart
                          size={16}
                          aria-hidden
                          className={cn(
                            "shrink-0 transition-colors",
                            liked ? "fill-primary text-primary" : "text-foreground/30",
                          )}
                        />
                      </span>
                      {point?.why && (
                        <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
                          {point.why}
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <SkeletonLines lines={3} />
          )}
        </Section>
      )}

      {/* REPRODUCE — 再現の鍵 */}
      {!!analysis?.reproductionEssentials?.length && (
        <Section eyebrow="How to Reproduce" title="雰囲気を再現する鍵">
          <ol className="space-y-3">
            {analysis.reproductionEssentials.filter(Boolean).map((ess, i) => (
              <li key={ess?.item ?? i} className="flex gap-3">
                <span className="font-display mt-0.5 text-lg font-semibold text-primary/80">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div>
                  <p className="text-sm font-medium leading-snug">{ess?.item}</p>
                  {ess?.why && (
                    <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                      {ess.why}
                    </p>
                  )}
                  {ess?.substitutable && ess?.substitution && (
                    <p className="mt-1 text-xs text-primary/90">代替案: {ess.substitution}</p>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </Section>
      )}

      {/* WARDROBE — 手持ちとの照合 */}
      {snap.analysis && (
        <Section eyebrow="Your Wardrobe" title="手持ちで、どこまで近づけるか">
          {closetCount === 0 ? (
            <Link
              href="/closet"
              className="flex items-center gap-3 rounded-lg border border-dashed border-primary/40 bg-primary/5 px-4 py-4"
            >
              <Shirt size={20} className="shrink-0 text-primary" aria-hidden />
              <span className="text-sm leading-relaxed">
                クローゼットに手持ち服を登録すると、
                <span className="text-primary">再現コーデ案と買うべきもの</span>
                がここに出ます
              </span>
            </Link>
          ) : (
            <MatchView
              match={match}
              running={pipeline.matchRunning}
              error={pipeline.matchError}
              closetItems={closetItems ?? []}
            />
          )}
        </Section>
      )}
    </main>
  );
}

function StatusBadge({ analyzing, error }: { analyzing: boolean; error: boolean }) {
  if (error) {
    return (
      <span className="rounded-full bg-destructive/80 px-3 py-1 text-[0.65rem] text-white">
        解析エラー
      </span>
    );
  }
  if (analyzing) {
    return (
      <span className="flex items-center gap-1.5 rounded-full bg-black/50 px-3 py-1 text-[0.65rem] text-white backdrop-blur-sm">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" aria-hidden />
        解析中…
      </span>
    );
  }
  return null;
}

function MatchView({
  match,
  running,
  error,
  closetItems,
}: {
  match: PartialMatch | undefined;
  running: boolean;
  error: string | undefined;
  closetItems: { id: string; name: string; thumbBlob: Blob }[];
}) {
  if (error) {
    return <p className="text-sm text-destructive">{error}</p>;
  }
  if (!match && running) {
    return (
      <div>
        <p className="mb-3 text-xs text-muted-foreground">手持ち服と照合しています…</p>
        <SkeletonLines lines={3} />
      </div>
    );
  }
  if (!match) {
    return <SkeletonLines lines={2} />;
  }

  const itemById = new Map(closetItems.map((item) => [item.id, item]));

  return (
    <div className="space-y-6">
      {/* 再現コーデ案 */}
      {match.outfits?.filter(Boolean).map((outfit, i) => (
        <article
          key={outfit?.title ?? i}
          className="rise-in rounded-xl border border-border bg-card/60 p-4"
        >
          <div className="flex items-start justify-between gap-3">
            <h3 className="font-display text-base font-semibold leading-snug">{outfit?.title}</h3>
            {typeof outfit?.closeness === "number" && (
              <span className="mt-1 shrink-0">
                <DotScale value={outfit.closeness} label="スナップへの近さ" />
              </span>
            )}
          </div>
          {!!outfit?.itemIds?.length && (
            <div className="mt-3 flex gap-2 overflow-x-auto no-scrollbar">
              {outfit.itemIds
                .map((itemId) => (itemId ? itemById.get(itemId) : undefined))
                .filter((item): item is NonNullable<typeof item> => !!item)
                .map((item) => (
                  <ClosetThumb key={item.id} name={item.name} blob={item.thumbBlob} />
                ))}
            </div>
          )}
          {outfit?.styling && (
            <p className="mt-3 text-sm leading-relaxed text-foreground/85">{outfit.styling}</p>
          )}
          {outfit?.gapNotes && (
            <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
              {outfit.gapNotes}
            </p>
          )}
        </article>
      ))}
      {match.outfits?.length === 0 && (
        <p className="text-sm leading-relaxed text-muted-foreground">
          今の手持ちだけでは近い雰囲気を組みにくいコーデです。下の「買い足すなら」から最短の一歩を。
        </p>
      )}

      {/* 買い足すなら */}
      {!!match.missingItems?.length && (
        <div>
          <p className="eyebrow mb-3">Buy Next</p>
          <ul className="space-y-2.5">
            {match.missingItems.filter(Boolean).map((item, i) => (
              <li
                key={item?.name ?? i}
                className="rounded-lg border border-border bg-card/60 px-4 py-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium">{item?.name}</p>
                  <PriorityBadge priority={item?.priority} />
                </div>
                {item?.reason && (
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    {item.reason}
                  </p>
                )}
                {item?.alternatives && (
                  <p className="mt-1 text-xs text-primary/90">代替: {item.alternatives}</p>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 買わなくていいもの */}
      {!!match.skipBuying?.length && (
        <div>
          <p className="eyebrow mb-3">Skip Buying</p>
          <ul className="space-y-2">
            {match.skipBuying.filter(Boolean).map((item, i) => (
              <li key={item?.name ?? i} className="text-sm leading-relaxed">
                <span className="text-foreground/70 line-through decoration-foreground/40">
                  {item?.name}
                </span>
                {item?.reason && (
                  <span className="block text-xs text-muted-foreground">{item.reason}</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {running && <SkeletonLines lines={2} />}
    </div>
  );
}

function PriorityBadge({ priority }: { priority: "high" | "medium" | "low" | undefined }) {
  if (!priority) return null;
  const label = { high: "優先", medium: "余裕があれば", low: "急がない" }[priority];
  return (
    <span
      className={cn(
        "shrink-0 rounded-full px-2.5 py-0.5 text-[0.625rem]",
        priority === "high"
          ? "bg-primary/20 text-primary"
          : priority === "medium"
            ? "border border-border text-foreground/80"
            : "text-muted-foreground",
      )}
    >
      {label}
    </span>
  );
}

function ClosetThumb({ name, blob }: { name: string; blob: Blob }) {
  const url = useObjectUrl(blob);
  return (
    <figure className="w-16 shrink-0">
      {url ? (
        // biome-ignore lint/performance/noImgElement: IndexedDB Blob の object URL は next/image 非対応
        <img
          src={url}
          alt={name}
          className="h-16 w-16 rounded-md border border-border object-cover"
        />
      ) : (
        <div className="shimmer h-16 w-16 rounded-md" />
      )}
      <figcaption className="mt-1 truncate text-[0.6rem] text-muted-foreground">{name}</figcaption>
    </figure>
  );
}
