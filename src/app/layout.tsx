import type { Metadata, Viewport } from "next";
import { Geist_Mono, Shippori_Mincho, Zen_Kaku_Gothic_New } from "next/font/google";
import "./globals.css";
import { TabNav } from "@/components/tab-nav";

// 見出し: 明朝 (ファッション誌のエディトリアル) / 本文: ゴシック / マイクロラベル: mono
const display = Shippori_Mincho({
  variable: "--font-display",
  weight: ["500", "600", "700"],
  subsets: ["latin"],
  preload: false,
});

const body = Zen_Kaku_Gothic_New({
  variable: "--font-body",
  weight: ["400", "500", "700"],
  subsets: ["latin"],
  preload: false,
});

const mono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SPEAD WEAR — スナップを、着られる形に",
  description:
    "気になったコーデをパシャ。AIが魅力を分解し、手持ち服での再現案と本当に買うべきものを返すスナップ翻訳アプリ",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "SPEAD WEAR",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#211d16",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ja"
      className={`dark ${display.variable} ${body.variable} ${mono.variable} h-full antialiased`}
    >
      <body className="min-h-dvh">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded-md focus:bg-background focus:px-3 focus:py-2 focus:text-sm focus:ring-2 focus:ring-ring"
        >
          メインコンテンツへスキップ
        </a>
        <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col">
          {children}
          <TabNav />
        </div>
      </body>
    </html>
  );
}
