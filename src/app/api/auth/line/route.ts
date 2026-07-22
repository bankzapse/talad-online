import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { isLineLoginConfigured, buildAuthUrl, isMobileUA } from "@/lib/line-login";
import { safeNext } from "@/lib/url";

// เริ่ม LINE Login — /api/auth/line?next=/sell  (หรือ &buyer=1 สำหรับผู้ซื้อ)
export async function GET(req: Request) {
  const url = new URL(req.url);
  const next = safeNext(url.searchParams.get("next"));
  const buyer = url.searchParams.get("buyer") === "1";

  if (!isLineLoginConfigured()) {
    // ยังไม่ตั้งค่า → กลับไปหน้า login แบบ demo (ต้องพา next ไปด้วย ไม่งั้นล็อกอินเสร็จหลงทาง)
    const p = new URLSearchParams();
    if (buyer) p.set("buyer", "1");
    if (next && next !== "/") p.set("next", next);
    return NextResponse.redirect(new URL(`/login?${p}`, url.origin));
  }

  // ใช้โดเมนที่ผู้ใช้เปิดอยู่จริงเป็นหลัก → callback ตรงกับโดเมนเสมอ
  // (NEXT_PUBLIC_APP_URL ใช้เป็น fallback เท่านั้น)
  const origin = url.origin || process.env.NEXT_PUBLIC_APP_URL!;
  const redirectUri = `${origin}/api/auth/line/callback`;
  const state = crypto.randomUUID();

  const jar = await cookies();
  // อายุ 20 นาที — ผู้ใช้ที่ต้องพิมพ์อีเมล/รหัสผ่าน LINE ใช้เวลานานกว่าคนที่มีแอป
  jar.set("line_oauth", JSON.stringify({ state, next, buyer }), {
    httpOnly: true,
    path: "/",
    maxAge: 1200,
    sameSite: "lax",
  });

  const onMobile = isMobileUA(req.headers.get("user-agent"));
  return NextResponse.redirect(buildAuthUrl(redirectUri, state, { qrFirst: !onMobile }));
}
