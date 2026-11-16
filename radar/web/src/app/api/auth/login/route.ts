import { NextResponse } from "next/server";
import { config, safeEqual } from "@/lib/config";
import { createSessionToken, SESSION_COOKIE } from "@/lib/session";

export async function POST(req: Request) {
  const form = await req.formData();
  const password = String(form.get("password") ?? "");
  const nextRaw = String(form.get("next") ?? "/");
  const next = nextRaw.startsWith("/") && !nextRaw.startsWith("//") ? nextRaw : "/";
  const expected = config.appPassword;
  const url = new URL(req.url);
  if (!expected) return NextResponse.redirect(new URL(next, url), 303);
  if (!safeEqual(password, expected)) {
    await new Promise((r) => setTimeout(r, 600));
    return NextResponse.redirect(new URL(`/login?error=1&next=${encodeURIComponent(next)}`, url), 303);
  }
  const { token, maxAge } = await createSessionToken();
  const res = NextResponse.redirect(new URL(next, url), 303);
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge,
    path: "/",
  });
  return res;
}
