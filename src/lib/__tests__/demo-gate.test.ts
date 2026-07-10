import { describe, expect, it } from "vitest";
import { isProtectedPath, passcodeCookieValue } from "@/lib/demo-gate";

describe("passcodeCookieValue", () => {
  it("同じパスコードから常に同じ値を導出する (Cookie 検証の前提)", async () => {
    const a = await passcodeCookieValue("open-sesame");
    const b = await passcodeCookieValue("open-sesame");
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
  });

  it("異なるパスコードは異なる値になる", async () => {
    expect(await passcodeCookieValue("aaaa")).not.toBe(await passcodeCookieValue("aaab"));
  });

  it("生パスコードが値に含まれない", async () => {
    expect(await passcodeCookieValue("open-sesame")).not.toContain("open-sesame");
  });
});

describe("isProtectedPath", () => {
  it.each([
    "/",
    "/snaps",
    "/snap/abc",
    "/closet",
    "/api/analyze",
    "/api/match",
  ])("アプリ本体と AI API は保護する: %s", (path) => {
    expect(isProtectedPath(path)).toBe(true);
  });

  it.each([
    "/login",
    "/api/login",
    "/manifest.webmanifest",
    "/favicon.ico",
    "/icon-192.png",
    "/icon-512.png",
    "/apple-touch-icon.png",
    "/_next/static/chunk.js",
  ])("ログイン導線と PWA アセットは素通しする: %s", (path) => {
    expect(isProtectedPath(path)).toBe(false);
  });
});
