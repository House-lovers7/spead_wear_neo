import type { NextConfig } from "next";

/**
 * セキュリティヘッダの静的定義。
 *
 * 方針:
 * - CSP は `unsafe-eval` を外す。ただし Next.js の dev HMR が eval を要求するため
 *   production ビルドでのみ厳格化し、dev は unsafe-eval を許容する
 * - frame-ancestors = 'self' (他サイトに埋め込まれない — clickjacking 防御)
 * - 外部サービス (Stripe / 分析等) を追加したら img-src / connect-src / frame-src を明示的に足す
 */
const isProd = process.env.NODE_ENV === "production";

// 画像はローカル (IndexedDB Blob → blob: URL) とカメラキャプチャ (canvas → data:/blob:) のみ
const IMAGE_SOURCES = ["'self'", "data:", "blob:"].join(" ");

// ローカルファースト設計のため外部接続なし (AI 呼び出しは同一オリジンの API Route 経由)
const CONNECT_SOURCES = ["'self'", "blob:"].join(" ");

// script-src は自分自身 + nonce / hash ベースを前提にしたいが、MVP では
// Tailwind 由来の inline style と Next.js の inline script を許可するため
// unsafe-inline を含める。
const SCRIPT_SOURCES = ["'self'", ...(isProd ? [] : ["'unsafe-eval'"]), "'unsafe-inline'"].join(
  " ",
);

const STYLE_SOURCES = ["'self'", "'unsafe-inline'"].join(" ");

const csp = [
  "default-src 'self'",
  `script-src ${SCRIPT_SOURCES}`,
  `style-src ${STYLE_SOURCES}`,
  `img-src ${IMAGE_SOURCES}`,
  `font-src 'self' data:`,
  `connect-src ${CONNECT_SOURCES}`,
  "frame-ancestors 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // カメラアプリのため camera は自オリジンに許可する (microphone / geolocation は不使用)
  { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=()" },
  ...(isProd
    ? [
        // HSTS は production のみ (local https の証明書事情を避ける)
        {
          key: "Strict-Transport-Security",
          value: "max-age=63072000; includeSubDomains; preload",
        },
      ]
    : []),
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
