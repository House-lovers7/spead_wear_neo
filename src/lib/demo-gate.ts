/**
 * デモゲート (共有パスコード) の共通ロジック。
 *
 * ユーザーアカウント認証ではない: 公開デモ URL を見せたい相手だけに絞るための
 * 共有パスコード 1 つと httpOnly Cookie による入場ゲート (ADR-0005)。
 * `DEMO_PASSCODE` 未設定時はゲート自体が無効になり、従来どおり全公開で動く。
 *
 * proxy (Node runtime) / Route Handler / Vitest から共用するため、
 * ハッシュは Web Crypto (`crypto.subtle`) のみで実装する。
 */

export const DEMO_COOKIE_NAME = "sw_demo_gate";

/** Cookie 有効期間 (秒)。デモ相手が期間中に再入力しなくて済む長さ。 */
export const DEMO_COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

/** パスコード変更やハッシュ方式変更で既存 Cookie を一括無効化するためのバージョン付きソルト。 */
const COOKIE_SALT = "spead-wear-demo-gate-v1";

/**
 * パスコードから Cookie 値 (SHA-256 hex) を導出する。
 * Cookie には生パスコードを載せず、検証はサーバ側で同じ導出値と比較する。
 */
export async function passcodeCookieValue(passcode: string): Promise<string> {
  const data = new TextEncoder().encode(`${COOKIE_SALT}:${passcode}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * ゲート対象パスかどうか。
 * ログイン画面/検証 API と、ログイン前でも必要な PWA アセットだけを素通しする。
 */
export function isProtectedPath(pathname: string): boolean {
  if (pathname === "/login" || pathname === "/api/login") return false;
  if (pathname === "/manifest.webmanifest" || pathname === "/favicon.ico") return false;
  if (/^\/(icon-\d+\.png|apple-touch-icon\.png)$/.test(pathname)) return false;
  if (pathname.startsWith("/_next/")) return false;
  return true;
}
