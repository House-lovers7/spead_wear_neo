import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "SPEAD WEAR — スナップを、着られる形に",
    short_name: "SPEAD WEAR",
    description:
      "気になったコーデをパシャ。AIが魅力を分解し、手持ち服での再現案と本当に買うべきものを返すスナップ翻訳アプリ",
    start_url: "/",
    display: "standalone",
    background_color: "#211d16",
    theme_color: "#211d16",
    orientation: "portrait",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
