"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CameraCapture } from "@/components/camera-capture";
import { ensureSnapPipeline } from "@/lib/analysis-runner";
import { createSnap } from "@/lib/db/local";
import { prepareImagePair } from "@/lib/image";

/**
 * ホーム = カメラ。気になったコーデを「パシャ」した瞬間に:
 * 1. クライアントで縮小 (長辺1024px JPEG)
 * 2. IndexedDB へ楽観的保存 (status: analyzing)
 * 3. バックグラウンド解析を開始
 * 4. 結果画面へ即遷移 (解析はストリーミングで流れ込む)
 */
export default function HomePage() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const handleCapture = async (blob: Blob) => {
    setBusy(true);
    try {
      const { image, thumb } = await prepareImagePair(blob);
      const snapId = await createSnap(image, thumb);
      ensureSnapPipeline(snapId);
      router.push(`/snap/${snapId}`);
    } catch {
      setBusy(false);
    }
  };

  return (
    <main id="main" className="relative flex min-h-dvh flex-col">
      {/* ブランドヘッダー (ビューファインダーに重ねる) */}
      <header className="pt-safe pointer-events-none absolute inset-x-0 top-0 z-10 bg-gradient-to-b from-black/60 to-transparent px-5 pb-10">
        <p className="eyebrow pt-4">Snap to Closet</p>
        <h1 className="font-display text-xl font-semibold tracking-wide text-white">SPEAD WEAR</h1>
      </header>

      <CameraCapture
        onCapture={handleCapture}
        busy={busy}
        hint={busy ? "解析の準備をしています…" : "気になったコーデを、そのままパシャ"}
      />
    </main>
  );
}
