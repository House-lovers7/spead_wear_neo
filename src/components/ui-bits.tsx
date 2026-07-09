import { cn } from "@/lib/utils";

/** 章扉: 英字マイクロラベル + 明朝見出し。 */
export function Section({
  eyebrow,
  title,
  children,
  className,
}: {
  eyebrow: string;
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rise-in px-5 py-6", className)}>
      <p className="eyebrow">{eyebrow}</p>
      <h2 className="font-display mt-1 text-lg font-semibold tracking-wide">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function Chip({
  children,
  active = false,
  className,
}: {
  children: React.ReactNode;
  active?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs transition-colors",
        active
          ? "border-primary/60 bg-primary/15 text-primary"
          : "border-border bg-secondary/50 text-foreground/90",
        className,
      )}
    >
      {children}
    </span>
  );
}

/** ストリーミング待ちのスケルトン行。 */
export function SkeletonLines({ lines = 2, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn("space-y-2", className)} aria-hidden>
      {Array.from({ length: lines }, (_, i) => (
        <div
          // biome-ignore lint/suspicious/noArrayIndexKey: 静的な装飾行のため index で十分
          key={i}
          className="shimmer h-3.5 rounded"
          style={{ width: `${88 - i * 14}%` }}
        />
      ))}
    </div>
  );
}

/** 1〜5 の度合いをドットで表す (closeness / formality)。 */
export function DotScale({
  value,
  max = 5,
  label,
}: {
  value: number;
  max?: number;
  label: string;
}) {
  return (
    <span
      role="img"
      className="inline-flex items-center gap-1"
      aria-label={`${label} ${value}/${max}`}
    >
      {Array.from({ length: max }, (_, i) => (
        <span
          // biome-ignore lint/suspicious/noArrayIndexKey: 固定長スケールのため index で十分
          key={i}
          className={cn("h-1.5 w-1.5 rounded-full", i < value ? "bg-primary" : "bg-foreground/15")}
          aria-hidden
        />
      ))}
    </span>
  );
}
