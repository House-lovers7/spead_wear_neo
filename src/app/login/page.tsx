import { LoginForm } from "./login-form";

/**
 * デモゲートの入場画面 (ADR-0005)。`DEMO_PASSCODE` 設定時のみ proxy がここへ誘導する。
 * open redirect 防止のため、戻り先はアプリ内パスに限定する。
 */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string | string[] }>;
}) {
  const { from } = await searchParams;
  const returnTo =
    typeof from === "string" && from.startsWith("/") && !from.startsWith("//") ? from : "/";

  return <LoginForm returnTo={returnTo} />;
}
