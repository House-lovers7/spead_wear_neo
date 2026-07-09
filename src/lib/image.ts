/**
 * 画像ユーティリティ (クライアント専用)。
 *
 * レイテンシ対策の要: 撮影・選択した画像はアップロード前に必ず縮小する。
 * スマホカメラの元画像 (数MB) をそのまま送ると、アップロードだけで数秒かかる。
 * 長辺 1024px の JPEG (~100-250KB) なら Vision モデルの解析精度も落ちない。
 */

export const ANALYZE_MAX_EDGE = 1024;
export const THUMB_MAX_EDGE = 320;
const JPEG_QUALITY = 0.82;

/** 縮小後の辺長を計算する (拡大はしない)。 */
export function fitWithin(
  width: number,
  height: number,
  maxEdge: number,
): { width: number; height: number } {
  const longest = Math.max(width, height);
  if (longest <= maxEdge) return { width, height };
  const scale = maxEdge / longest;
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

async function drawToJpeg(source: CanvasImageSource, width: number, height: number): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas 2d context を取得できませんでした");
  ctx.drawImage(source, 0, 0, width, height);
  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("JPEG エンコードに失敗しました"))),
      "image/jpeg",
      JPEG_QUALITY,
    );
  });
}

/** File / Blob を長辺 maxEdge の JPEG に縮小する。 */
export async function resizeImage(input: Blob, maxEdge: number): Promise<Blob> {
  const bitmap = await createImageBitmap(input);
  try {
    const { width, height } = fitWithin(bitmap.width, bitmap.height, maxEdge);
    return await drawToJpeg(bitmap, width, height);
  } finally {
    bitmap.close();
  }
}

/** ビデオの現在フレームを長辺 maxEdge の JPEG として切り出す (シャッター処理)。 */
export async function captureVideoFrame(
  video: HTMLVideoElement,
  maxEdge: number = ANALYZE_MAX_EDGE,
): Promise<Blob> {
  const { width, height } = fitWithin(video.videoWidth, video.videoHeight, maxEdge);
  if (width === 0 || height === 0) throw new Error("カメラ映像がまだ準備できていません");
  return await drawToJpeg(video, width, height);
}

export async function blobToDataUrl(blob: Blob): Promise<string> {
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error ?? new Error("Blob の読み込みに失敗しました"));
    reader.readAsDataURL(blob);
  });
}

/** 解析用 (1024px) とサムネイル (320px) を一度に作る。 */
export async function prepareImagePair(input: Blob): Promise<{ image: Blob; thumb: Blob }> {
  const image = await resizeImage(input, ANALYZE_MAX_EDGE);
  const thumb = await resizeImage(image, THUMB_MAX_EDGE);
  return { image, thumb };
}
