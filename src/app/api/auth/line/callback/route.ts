import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { exchangeCodeForToken, getLineProfile } from "@/lib/line-login";
import { upsertSellerFromLine } from "@/lib/data";
import { SESSION_COOKIE, BUYER_COOKIE } from "@/lib/auth";
import { createSessionToken } from "@/lib/session";
import { safeNext } from "@/lib/url";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  // ต้องใช้ origin เดียวกับตอนขอ authorize (โดเมนที่ผู้ใช้เปิดจริง)
  const origin = url.origin || process.env.NEXT_PUBLIC_APP_URL!;

  const jar = await cookies();
  const raw = jar.get("line_oauth")?.value;
  jar.delete("line_oauth");

  if (!code || !state || !raw) {
    return NextResponse.redirect(new URL("/login?error=oauth", origin));
  }
  const saved = JSON.parse(raw) as { state: string; next: string; buyer: boolean };
  if (saved.state !== state) {
    return NextResponse.redirect(new URL("/login?error=state", origin));
  }

  const redirectUri = `${origin}/api/auth/line/callback`;
  const token = await exchangeCodeForToken(code, redirectUri);
  if (!token) return NextResponse.redirect(new URL("/login?error=token", origin));

  const profile = await getLineProfile(token.access_token);
  if (!profile) return NextResponse.redirect(new URL("/login?error=profile", origin));

  const opts = { httpOnly: true, path: "/", maxAge: 60 * 60 * 24 * 30, sameSite: "lax" as const };

  if (saved.buyer) {
    // ผู้ซื้อ — ใช้ LINE userId เป็น key (gate ปุ่มติดต่อ + rate-limit)
    jar.set(BUYER_COOKIE, createSessionToken(profile.userId), opts);
  } else {
    const seller = await upsertSellerFromLine(profile.userId, profile.displayName);
    jar.set(SESSION_COOKIE, createSessionToken(seller.id), opts);
  }

  return NextResponse.redirect(new URL(safeNext(saved.next), origin));
}
