"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { Plus, Trash2, X } from "lucide-react";
import { useState } from "react";
import { CameraCapture } from "@/components/camera-capture";
import { Chip, SkeletonLines } from "@/components/ui-bits";
import { streamJsonObject } from "@/lib/ai/client";
import { type ClosetItemAttrs, closetItemAttrsSchema, itemCategories } from "@/lib/ai/schemas";
import type { DeepPartial } from "@/lib/analysis-runner";
import { addClosetItem, type ClosetItemRecord, db } from "@/lib/db/local";
import { blobToDataUrl, prepareImagePair } from "@/lib/image";
import { useObjectUrl } from "@/lib/use-object-url";
import { cn } from "@/lib/utils";

/**
 * クローゼット。このカテゴリ最大の離脱要因は「登録が重い」ことなので、
 * 登録は 撮影1回 → AI自動分類 (ストリーミング) → 確認して1タップ保存 に絞る。
 */
export default function ClosetPage() {
  const items = useLiveQuery(() => db.closetItems.orderBy("createdAt").reverse().toArray(), []);
  const [adding, setAdding] = useState(false);
  const [selected, setSelected] = useState<ClosetItemRecord | null>(null);

  return (
    <main id="main" className="min-h-dvh px-5 pb-28 pt-safe">
      <header className="flex items-end justify-between pt-6">
        <div>
          <p className="eyebrow">Wardrobe</p>
          <h1 className="font-display mt-1 text-2xl font-semibold tracking-wide">クローゼット</h1>
          <p className="mt-1 text-xs text-muted-foreground">
            {items?.length ?? 0} 点 — 登録するほど再現案が正確になります
          </p>
        </div>
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-medium text-primary-foreground transition active:scale-95"
        >
          <Plus size={15} aria-hidden />
          追加
        </button>
      </header>

      {items && items.length === 0 && (
        <div className="mt-16 text-center">
          <p className="font-display text-lg">まだ何も登録されていません</p>
          <p className="mx-auto mt-2 max-w-[16rem] text-sm leading-relaxed text-muted-foreground">
            手持ちの服を撮るだけ。分類はAIがやります。よく着る10着から始めるのがおすすめ。
          </p>
        </div>
      )}

      <ul className="mt-6 grid grid-cols-3 gap-2.5">
        {items?.map((item) => (
          <li key={item.id}>
            <ItemCell item={item} onSelect={() => setSelected(item)} />
          </li>
        ))}
      </ul>

      {adding && <AddItemFlow onClose={() => setAdding(false)} />}
      {selected && <ItemSheet item={selected} onClose={() => setSelected(null)} />}
    </main>
  );
}

function ItemCell({ item, onSelect }: { item: ClosetItemRecord; onSelect: () => void }) {
  const url = useObjectUrl(item.thumbBlob);
  return (
    <button type="button" onClick={onSelect} className="w-full text-left">
      {url ? (
        // biome-ignore lint/performance/noImgElement: IndexedDB Blob の object URL は next/image 非対応
        <img
          src={url}
          alt={item.name}
          className="aspect-square w-full rounded-lg border border-border object-cover"
        />
      ) : (
        <div className="shimmer aspect-square w-full rounded-lg" />
      )}
      <p className="mt-1 truncate text-[0.65rem] leading-tight text-foreground/85">{item.name}</p>
      <p className="text-[0.6rem] text-muted-foreground">{item.category}</p>
    </button>
  );
}

/** アイテム詳細 + 削除。 */
function ItemSheet({ item, onClose }: { item: ClosetItemRecord; onClose: () => void }) {
  const url = useObjectUrl(item.imageBlob);
  return (
    <div
      className="fixed inset-0 z-50 mx-auto flex w-full max-w-md items-end bg-black/60"
      role="dialog"
      aria-modal
    >
      <div className="rise-in w-full rounded-t-2xl border-t border-border bg-background p-5 pb-safe">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-display text-lg font-semibold">{item.name}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {item.category} ・ {item.colors.join(" / ")} ・ {item.silhouette}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="閉じる"
            className="p-1 text-muted-foreground"
          >
            <X size={20} aria-hidden />
          </button>
        </div>
        {url && (
          // biome-ignore lint/performance/noImgElement: IndexedDB Blob の object URL は next/image 非対応
          <img src={url} alt={item.name} className="mt-4 max-h-72 w-full rounded-lg object-cover" />
        )}
        <div className="mt-3 flex flex-wrap gap-2">
          {item.taste.map((t) => (
            <Chip key={t}>{t}</Chip>
          ))}
          <Chip>{item.seasons.join("・")}</Chip>
        </div>
        <button
          type="button"
          onClick={() => {
            void db.closetItems.delete(item.id).then(onClose);
          }}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg border border-destructive/40 py-2.5 text-sm text-destructive"
        >
          <Trash2 size={15} aria-hidden />
          このアイテムを削除
        </button>
      </div>
    </div>
  );
}

type AddPhase = { step: "camera" } | { step: "review"; image: Blob; thumb: Blob };

/** 追加フロー: 撮影 → AI分類ストリーミング → 確認1タップ保存。 */
function AddItemFlow({ onClose }: { onClose: () => void }) {
  const [phase, setPhase] = useState<AddPhase>({ step: "camera" });
  const [busy, setBusy] = useState(false);

  const handleCapture = async (blob: Blob) => {
    setBusy(true);
    try {
      const pair = await prepareImagePair(blob);
      setPhase({ step: "review", image: pair.image, thumb: pair.thumb });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 mx-auto flex w-full max-w-md flex-col bg-background"
      role="dialog"
      aria-modal
    >
      <div className="pt-safe flex items-center justify-between px-4 py-3">
        <p className="font-display text-base font-semibold">アイテムを追加</p>
        <button
          type="button"
          onClick={onClose}
          aria-label="閉じる"
          className="p-1 text-muted-foreground"
        >
          <X size={20} aria-hidden />
        </button>
      </div>

      {phase.step === "camera" ? (
        <div className="flex flex-1 flex-col">
          <CameraCapture
            onCapture={handleCapture}
            busy={busy}
            hint="服1点が写るように撮る (ハンガー掛け・床置きOK)"
          />
        </div>
      ) : (
        <ReviewForm image={phase.image} thumb={phase.thumb} onDone={onClose} />
      )}
    </div>
  );
}

const SEASONS = ["春", "夏", "秋", "冬"] as const;

function ReviewForm({ image, thumb, onDone }: { image: Blob; thumb: Blob; onDone: () => void }) {
  const imageUrl = useObjectUrl(image);
  const [attrs, setAttrs] = useState<DeepPartial<ClosetItemAttrs>>({});
  const [phase, setPhase] = useState<"classifying" | "confirm" | "saving">("classifying");
  const [error, setError] = useState<string>();

  // 撮影直後に一度だけ分類を開始する
  const [started, setStarted] = useState(false);
  if (!started) {
    setStarted(true);
    void (async () => {
      try {
        const dataUrl = await blobToDataUrl(image);
        const raw = await streamJsonObject("/api/closet/categorize", { image: dataUrl }, (p) => {
          setAttrs(p as DeepPartial<ClosetItemAttrs>);
        });
        const parsed = closetItemAttrsSchema.safeParse(raw);
        if (parsed.success) {
          setAttrs(parsed.data);
        }
        setPhase("confirm");
      } catch {
        setError("自動分類に失敗しました。手動で入力してください。");
        setPhase("confirm");
      }
    })();
  }

  const update = <K extends keyof ClosetItemAttrs>(key: K, value: ClosetItemAttrs[K]) =>
    setAttrs((prev) => ({ ...prev, [key]: value }));

  const save = async () => {
    setPhase("saving");
    // 欠けている項目は無難なデフォルトで補完 (登録の摩擦を最小にする)
    const complete: ClosetItemAttrs = {
      category: (attrs.category as ClosetItemAttrs["category"]) ?? "その他",
      name: attrs.name?.trim() || "名称未設定のアイテム",
      colors: (attrs.colors?.filter((c): c is string => !!c) ?? []).slice(0, 3),
      silhouette: attrs.silhouette ?? "標準",
      taste: (attrs.taste?.filter((t): t is string => !!t) ?? ["カジュアル"]).slice(0, 3),
      seasons: (attrs.seasons?.filter((s): s is "春" | "夏" | "秋" | "冬" => !!s) ?? []).length
        ? (attrs.seasons as ClosetItemAttrs["seasons"])
        : ["春", "秋"],
      formality: typeof attrs.formality === "number" ? attrs.formality : 2,
    };
    if (complete.colors.length === 0) complete.colors = ["不明"];
    await addClosetItem(complete, image, thumb);
    onDone();
  };

  return (
    <div className="flex-1 overflow-y-auto px-5 pb-10">
      {imageUrl && (
        // biome-ignore lint/performance/noImgElement: IndexedDB Blob の object URL は next/image 非対応
        <img
          src={imageUrl}
          alt="登録するアイテム"
          className="mx-auto max-h-60 rounded-xl object-cover"
        />
      )}

      {phase === "classifying" && !attrs.name ? (
        <div className="mt-6">
          <p className="mb-3 text-xs text-muted-foreground">AIが分類しています…</p>
          <SkeletonLines lines={3} />
        </div>
      ) : (
        <div className="rise-in mt-6 space-y-4">
          {error && <p className="text-xs text-destructive">{error}</p>}

          <label className="block">
            <span className="eyebrow">Name</span>
            <input
              type="text"
              value={attrs.name ?? ""}
              onChange={(e) => update("name", e.target.value)}
              placeholder="例: 黒のテーパードスラックス"
              className="mt-1.5 w-full rounded-lg border border-input bg-card/60 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </label>

          <div>
            <span className="eyebrow">Category</span>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {itemCategories.map((cat) => (
                <button key={cat} type="button" onClick={() => update("category", cat)}>
                  <Chip active={attrs.category === cat}>{cat}</Chip>
                </button>
              ))}
            </div>
          </div>

          <label className="block">
            <span className="eyebrow">Colors</span>
            <input
              type="text"
              value={(attrs.colors ?? []).filter(Boolean).join("、")}
              onChange={(e) =>
                update(
                  "colors",
                  e.target.value
                    .split(/[、,]/)
                    .map((c) => c.trim())
                    .filter(Boolean),
                )
              }
              placeholder="例: 黒、グレー"
              className="mt-1.5 w-full rounded-lg border border-input bg-card/60 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </label>

          <div>
            <span className="eyebrow">Seasons</span>
            <div className="mt-1.5 flex gap-2">
              {SEASONS.map((season) => {
                const selected = (attrs.seasons ?? []).includes(season);
                return (
                  <button
                    key={season}
                    type="button"
                    onClick={() => {
                      const current = (attrs.seasons ?? []).filter(
                        (s): s is (typeof SEASONS)[number] => !!s,
                      );
                      update(
                        "seasons",
                        selected ? current.filter((s) => s !== season) : [...current, season],
                      );
                    }}
                  >
                    <Chip active={selected}>{season}</Chip>
                  </button>
                );
              })}
            </div>
          </div>

          <button
            type="button"
            onClick={() => void save()}
            disabled={phase === "saving"}
            className={cn(
              "mt-2 w-full rounded-xl bg-primary py-3.5 text-sm font-medium text-primary-foreground transition active:scale-[0.98]",
              phase === "saving" && "opacity-60",
            )}
          >
            {phase === "saving" ? "保存中…" : "クローゼットに保存"}
          </button>
        </div>
      )}
    </div>
  );
}
