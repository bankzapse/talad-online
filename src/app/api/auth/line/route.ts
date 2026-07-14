import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { isLineLoginConfigured, buildAuthUrl } from "@/lib/line-login";

// เริ่ม LINE Login — /api/auth/line?next=/sell  (หรือ &buyer=1 สำหรับผู้ซื้อ)
export async function GET(req: Request) {
  const url = new URL(req.url);
  const next = url.searchParams.get("next") || "/";
  const buyer = url.searchParams.get("buyer") === "1";

  if (!isLineLoginConfigured()) {
    // ยังไม่ตั้งค่า → กลับไปหน้า login แบบ demo
    return NextResponse.redirect(new URL(buyer ? "/login?buyer=1" : "/login", url.origin));
  }

  const origin = process.env.NEXT_PUBLIC_APP_URL || url.origin;
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
