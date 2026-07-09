"use client";

import { ImageIcon, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { captureVideoFrame } from "@/lib/image";
import { cn } from "@/lib/utils";

/**
 * フルスクリーンのライブビューファインダー + シャッター。
 *
 * 「パシャ → 即解析」の入口。撮影後の処理 (縮小・保存・解析開始・遷移) は
 * onCapture に委ね、このコンポーネントはカメラ体験だけに責任を持つ。
 * getUserMedia が使えない環境 (権限拒否 / 非対応 / 非HTTPS) では
 * ファイル選択 (ネイティブカメラ起動 or ライブラリ) へフォールバックする。
 */

type CameraState = "starting" | "live" | "unavailable";

export function CameraCapture({
  onCapture,
  busy = false,
  hint,
}: {
  /** 撮影/選択した元画像を受け取る。縮小前の Blob。 */
  onCapture: (blob: Blob) => void | Promise<void>;
  /** 撮影後の処理中 (シャッターを無効化)。 */
  busy?: boolean;
  /** ビューファインダー下部に出す一言。 */
  hint?: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const disposedRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<CameraState>("starting");
  const [flash, setFlash] = useState(false);

  const startCamera = useCallback(async () => {
    setState("starting");
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error("unsupported");
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });
      // getUserMedia の解決前にアンマウントされた場合、ここで止めないとカメラが掴まれ続ける
      if (disposedRef.current) {
        for (const track of stream.getTracks()) track.stop();
        return;
      }
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      setState("live");
    } catch {
      if (!disposedRef.current) setState("unavailable");
    }
  }, []);

  useEffect(() => {
    disposedRef.current = false;
    void startCamera();
    return () => {
      disposedRef.current = true;
      for (const track of streamRef.current?.getTracks() ?? []) track.stop();
      streamRef.current = null;
    };
  }, [startCamera]);

  const handleShutter = useCallback(async () => {
    const video = videoRef.current;
    if (!video || busy) return;
    setFlash(true);
    navigator.vibrate?.(30);
    setTimeout(() => setFlash(false), 350);
    const blob = await captureVideoFrame(video);
    await onCapture(blob);
  }, [busy, onCapture]);

  const handleFile = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      event.target.value = "";
      if (!file || busy) return;
      await onCapture(file);
    },
    [busy, onCapture],
  );

  return (
    <div className="relative flex-1 overflow-hidden bg-black">
      {/* ビューファインダー */}
      <video
        ref={videoRef}
        playsInline
        muted
        autoPlay
        className={cn(
          "absolute inset-0 h-full w-full object-cover transition-opacity duration-500",
          state === "live" ? "opacity-100" : "opacity-0",
        )}
      />

      {/* シャッターフラッシュ */}
      {flash && (
        <div className="shutter-flash pointer-events-none absolute inset-0 z-20 bg-white" />
      )}

      {/* カメラ不可時のフォールバック */}
      {state !== "live" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-8 text-center">
          {state === "starting" ? (
            <p className="text-sm text-muted-foreground">カメラを起動しています…</p>
          ) : (
            <>
              <p className="text-sm leading-relaxed text-muted-foreground">
                カメラを起動できませんでした。
                <br />
                下のボタンから撮影または画像を選択できます。
              </p>
              <button
                type="button"
                onClick={() => startCamera()}
                className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-xs text-foreground"
              >
                <RefreshCw size={14} aria-hidden />
                カメラを再試行
              </button>
            </>
          )}
        </div>
      )}

      {/* 下部コントロール */}
      <div className="absolute inset-x-0 bottom-16 z-10 flex flex-col items-center gap-3 pb-safe">
        {hint && (
          <p className="rounded-full bg-black/45 px-4 py-1.5 text-xs text-white/85 backdrop-blur-sm">
            {hint}
          </p>
        )}
        <div className="flex w-full items-center justify-center">
          {/* ライブラリから選択 */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={busy}
            aria-label="ライブラリから画像を選ぶ"
            className="absolute left-10 flex h-12 w-12 items-center justify-center rounded-full border border-white/25 bg-black/40 text-white/90 backdrop-blur-sm transition active:scale-95 disabled:opacity-40"
          >
            <ImageIcon size={20} aria-hidden />
          </button>

          {/* シャッター */}
          <button
            type="button"
            onClick={handleShutter}
            disabled={busy || state !== "live"}
            aria-label="撮影する"
            className={cn(
              "flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-full border-4 border-white/90 transition active:scale-90",
              busy ? "opacity-50" : "opacity-100",
            )}
          >
            <span
              className={cn("block h-14 w-14 rounded-full bg-white transition", busy && "shimmer")}
            />
          </button>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFile}
        className="hidden"
        aria-hidden
        tabIndex={-1}
      />
    </div>
  );
}
