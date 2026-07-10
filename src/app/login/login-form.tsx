"use client";

import { KeyRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";

/** デモゲートのパスコード入力フォーム。成功したら元のページへ戻る。 */
export function LoginForm({ returnTo }: { returnTo: string }) {
  const router = useRouter();
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (busy || passcode.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passcode }),
      });
      if (res.ok) {
        router.replace(returnTo);
        router.refresh();
        return;
      }
      setError(
        res.status === 401
          ? "パスコードが違います"
          : "確認に失敗しました。時間をおいて再度お試しください",
      );
    } catch {
      setError("通信に失敗しました。電波状況を確認してください");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main id="main" className="flex min-h-dvh flex-col items-center justify-center px-8">
      <div className="rise-in w-full max-w-xs text-center">
        <p className="eyebrow">Private Preview</p>
        <h1 className="font-display mt-2 text-2xl font-semibold tracking-wide">SPEAD WEAR</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          デモ公開中のため、共有されたパスコードを入力してください
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-3">
          <label className="sr-only" htmlFor="passcode">
            デモ用パスコード
          </label>
          <input
            id="passcode"
            type="password"
            autoComplete="off"
            value={passcode}
            onChange={(e) => {
              setPasscode(e.target.value);
              setError(null);
            }}
            placeholder="パスコード"
            className="w-full rounded-lg border border-input bg-card px-4 py-3 text-center text-lg tracking-[0.3em] placeholder:text-sm placeholder:tracking-normal placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <button
            type="submit"
            disabled={busy || passcode.length === 0}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-3 font-medium text-primary-foreground transition-opacity disabled:opacity-40"
          >
            <KeyRound size={16} aria-hidden />
            {busy ? "確認中…" : "入室する"}
          </button>
        </form>

        <p aria-live="polite" className="mt-4 min-h-5 text-sm text-destructive">
          {error}
        </p>
      </div>
    </main>
  );
}
