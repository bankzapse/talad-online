import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { exchangeCodeForToken, getLineProfile } from "@/lib/line-login";
import { upsertSellerFromLine } from "@/lib/data";
import { linkSellerRichMenu } from "@/lib/line";
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

  let saved: { state: string; next: string; buyer: boolean } | null = null;
  try {
    saved = raw ? JSON.parse(raw) : null;
  } catch {
    saved = null;
  }

  // ล็อกอินไม่สำเร็จ → กลับไปหน้า login "ของบทบาทเดิม" พร้อมปลายทางเดิม
  // เดิมส่งกลับ /login เปล่า ๆ → ผู้ซื้อไปโผล่หน้าล็อกอินผู้ขาย และปลายทางที่ตั้งใจไปหายเกลี้ยง
  const fail = (reason: string) => {
    const p = new URLSearchParams({ error: reason });
    if (saved?.buyer) p.set("buyer", "1");
    if (saved?.next) p.set("next", safeNext(saved.next));
    return NextResponse.redirect(new URL(`/login?${p}`, origin));
  };

  // ผู้ใช้กดยกเลิกที่หน้า LINE
  if (url.searchParams.get("error")) return fail("cancelled");
  // cookie หาย = เปิดคนละเบราว์เซอร์กับตอนเริ่ม (in-app browser เด้งออกไปแอปอื่น)
  // หรือค้างไว้นานเกิน 20 นาที
  if (!saved) return fail("session");
  if (!code || !state) return fail("oauth");
  if (saved.state !== state) return fail("state");

  const redirectUri = `${origin}/api/auth/line/callback`;
  const token = await exchangeCodeForToken(code, redirectUri);
  if (!token) return fail("token");

  const profile = await getLineProfile(token.access_token);
  if (!profile) return fail("profile");

  const opts = { httpOnly: true, path: "/", maxAge: 60 * 60 * 24 * 30, sameSite: "lax" as const };

  if (saved.buyer) {
    // ผู้ซื้อ — ใช้ LINE userId เป็น key (gate ปุ่มติดต่อ + rate-limit)
    jar.set(BUYER_COOKIE, createSessionToken(profile.userId), opts);
    return NextResponse.redirect(new URL(safeNext(saved.next), origin));
  }

  const seller = await upsertSellerFromLine(profile.userId, profile.displayName);
  jar.set(SESSION_COOKIE, createSessionToken(seller.id), opts);

  // สลับเมนูในแชท LINE เป็นเมนูผู้ขาย (ล้มเหลวไม่กระทบการล็อกอิน)
  void linkSellerRichMenu(profile.userId);

  // ผู้ขายใหม่ยังไม่มีชื่อร้าน → พาไปกรอกข้อมูลร้านต่อเลย
  // (ไม่งั้นตกไปหน้า /sell ที่ยังทำอะไรไม่ได้ ต้องหาปุ่มเอง)
  if (!seller.shopName) {
    const next = saved.next && saved.next !== "/sell" ? saved.next : "/sell/new";
    return NextResponse.redirect(
      new URL(`/sell/profile?welcome=1&next=${encodeURIComponent(safeNext(next, "/sell/new"))}`, origin)
    );
  }

  return NextResponse.redirect(new URL(safeNext(saved.next), origin));
}
