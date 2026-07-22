import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { isLineLoginConfigured, buildAuthUrl, isMobileUA } from "@/lib/line-login";
import { safeNext } from "@/lib/url";
import { createOAuthState } from "@/lib/oauth-state";

// เริ่ม LINE Login — /api/auth/line?next=/sell  (หรือ &buyer=1 สำหรับผู้ซื้อ)
//   &email=1   ข้ามหน้า QR ไปหน้ากรอกอีเมลเลย (ทางออกสำรองบนคอมฯ)
//   &noliff=1  ห้ามอ้อมผ่าน LIFF (ใช้ตอน LIFF พังแล้วถอยมาทางนี้ — กันวนไม่จบ)
export async function GET(req: Request) {
  const url = new URL(req.url);
  const next = safeNext(url.searchParams.get("next"));
  const buyer = url.searchParams.get("buyer") === "1";
  const ua = req.headers.get("user-agent");

  if (!isLineLoginConfigured()) {
    // ยังไม่ตั้งค่า → กลับไปหน้า login แบบ demo (ต้องพา next ไปด้วย ไม่งั้นล็อกอินเสร็จหลงทาง)
    const p = new URLSearchParams();
    if (buyer) p.set("buyer", "1");
    if (next && next !== "/") p.set("next", next);
    return NextResponse.redirect(new URL(`/login?${p}`, url.origin));
  }

  const role = buyer ? "buyer" : "seller";
  const onMobile = isMobileUA(ua);
  const noLiff = url.searchParams.get("noliff") === "1";
  const wantsEmail = url.searchParams.get("email") === "1";
  const liffId = buyer
    ? process.env.NEXT_PUBLIC_LIFF_ID_BUYER
    : process.env.NEXT_PUBLIC_LIFF_ID_SELLER;

  // ---- ทางลัดผ่าน LIFF (มือถือเท่านั้น) ----
  // หน้าล็อกอินของ LINE บนเบราว์เซอร์มือถือขึ้นช่องอีเมล+รหัสผ่านเป็นหลัก
  // ปุ่ม "เข้าสู่ระบบด้วยแอป LINE" ถูกซ่อนไว้ล่างสุดใต้หัวข้อ "กรณีเข้าสู่ระบบไม่ได้"
  //
  // ส่งไปหน้า /liff แทน — ที่นั่นจะจัดการต่อตามบริบท:
  //   อยู่ในแอป LINE  → ขอ id_token เงียบ ๆ เข้าเลย
  //   นอกแอป LINE     → โชว์ปุ่มให้ "แตะเอง" เพื่อเปิดแอป
  //                     (redirect ไป liff.line.me เองไม่ได้ผล — OS เปิดแอปให้เฉพาะ
  //                      ตอนผู้ใช้แตะลิงก์จริง ยืนยันจากคลิปหน้าจอแล้ว)
  if (liffId && onMobile && !noLiff && !wantsEmail) {
    const to = new URL(`/liff/${role}`, url.origin);
    to.searchParams.set("next", next);
    return NextResponse.redirect(to);
  }

  // ---- OAuth ปกติ ----
  // ใช้โดเมนที่ผู้ใช้เปิดอยู่จริงเป็นหลัก → callback ตรงกับโดเมนเสมอ
  // (NEXT_PUBLIC_APP_URL ใช้เป็น fallback เท่านั้น)
  const origin = url.origin || process.env.NEXT_PUBLIC_APP_URL!;
  const redirectUri = `${origin}/api/auth/line/callback`;

  // state เซ็น HMAC พร้อม next/buyer อยู่ข้างใน — callback อ่านได้เองแม้ cookie หาย
  const state = createOAuthState({ next, buyer });

  const jar = await cookies();
  // cookie ยังเก็บไว้เป็นชั้นที่แน่นกว่า (ผูก session กับเบราว์เซอร์ที่เริ่ม)
  // อายุ 20 นาที — ผู้ใช้ที่ต้องพิมพ์อีเมล/รหัสผ่าน LINE ใช้เวลานานกว่าคนที่มีแอป
  jar.set("line_oauth", JSON.stringify({ state, next, buyer }), {
    httpOnly: true,
    path: "/",
    maxAge: 1200,
    sameSite: "lax",
  });

  return NextResponse.redirect(
    buildAuthUrl(redirectUri, state, { qrFirst: !onMobile && !wantsEmail })
  );
}
