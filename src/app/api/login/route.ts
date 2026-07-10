import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { DEMO_COOKIE_MAX_AGE, DEMO_COOKIE_NAME, passcodeCookieValue } from "@/lib/demo-gate";
import { env } from "@/lib/env";

/**
 * デモゲートのパスコード検証 (ADR-0005)。
 * 一致したら httpOnly Cookie を発行する。ユーザーアカウントは存在しない。
 */

const bodySchema = z.object({ passcode: z.string().min(1).max(100) });

export async function POST(req: Request) {
  if (!env.DEMO_PASSCODE) {
    return Response.json({ error: "demo gate is disabled" }, { status: 404 });
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "invalid request body" }, { status: 400 });
  }

  // 生パスコードではなく導出ハッシュ同士を定数時間比較 (長さも常に一致する)
  const expected = await passcodeCookieValue(env.DEMO_PASSCODE);
  const got = await passcodeCookieValue(parsed.data.passcode);
  if (!timingSafeEqual(Buffer.from(expected), Buffer.from(got))) {
    return Response.json({ error: "passcode mismatch" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set({
    name: DEMO_COOKIE_NAME,
    value: expected,
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: DEMO_COOKIE_MAX_AGE,
  });
  return res;
}
