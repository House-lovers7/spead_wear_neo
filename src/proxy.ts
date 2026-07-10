import { type NextRequest, NextResponse } from "next/server";
import { DEMO_COOKIE_NAME, isProtectedPath, passcodeCookieValue } from "@/lib/demo-gate";
import { env } from "@/lib/env";

/**
 * デモゲート (ADR-0005)。`DEMO_PASSCODE` が設定されている環境でのみ、
 * 全ページ・全 API を共有パスコード Cookie で保護する。
 * 未設定 (ローカル開発の既定) では何もしない。
 */
export async function proxy(request: NextRequest) {
  const passcode = env.DEMO_PASSCODE;
  if (!passcode) return NextResponse.next();

  const { pathname } = request.nextUrl;
  if (!isProtectedPath(pathname)) return NextResponse.next();

  const cookie = request.cookies.get(DEMO_COOKIE_NAME)?.value;
  if (cookie === (await passcodeCookieValue(passcode))) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/")) {
    return Response.json({ error: "demo passcode required" }, { status: 401 });
  }

  const loginUrl = new URL("/login", request.url);
  if (pathname !== "/") loginUrl.searchParams.set("from", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  // 静的アセットは素通し。/api を含む残り全ルートをゲート対象にする
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|icon-192.png|icon-512.png|apple-touch-icon.png).*)",
  ],
};
