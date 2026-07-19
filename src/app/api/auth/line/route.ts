import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { isLineLoginConfigured, buildAuthUrl } from "@/lib/line-login";
import { safeNext } from "@/lib/url";

// เริ่ม LINE Login — /api/auth/line?next=/sell  (หรือ &buyer=1 สำหรับผู้ซื้อ)
export async function GET(req: Request) {
  const url = new URL(req.url);
  const next = safeNext(url.searchParams.get("next"));
  const buyer = url.searchParams.get("buyer") === "1";

  if (!isLineLoginConfigured()) {
    // ยังไม่ตั้งค่า → กลับไปหน้า login แบบ demo
    return NextResponse.redirect(new URL(buyer ? "/login?buyer=1" : "/login", url.origin));
  }

  // ใช้โดเมนที่ผู้ใช้เปิดอยู่จริงเป็นหลัก → callback ตรงกับโดเมนเสมอ
  // (NEXT_PUBLIC_APP_URL ใช้เป็น fallback เท่านั้น)
  const origin = url.origin || process.env.NEXT_PUBLIC_APP_URL!;
  const redirectUri = `${origin}/api/auth/line/callback`;
  const state = crypto.randomUUID();

  const jar = await cookies();
  jar.set("line_oauth", JSON.stringify({ state, next, buyer }), {
    httpOnly: true,
    path: "/",
    maxAge: 600,
    sameSite: "lax",
  });

  return NextResponse.redirect(buildAuthUrl(redirectUri, state));
}
