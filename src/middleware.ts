import { NextResponse, type NextRequest } from "next/server";

// -----------------------------------------------------------------------------
// 1) ป้องกันหน้า /admin
// 2) หน้าที่ต้องล็อกอิน → เด้งไป LINE ตั้งแต่ยังไม่ทันเริ่ม render
//
// ทำไมด่านล็อกอินต้องอยู่ตรงนี้ ไม่ใช่ใน page: redirect() ใน Server Component ที่
// เริ่ม stream ไปแล้ว Next จะส่งกลับเป็น <meta http-equiv="refresh" content="1;...">
// = ค้างหน้าขาว 1 วิก่อนไปต่อ ส่วน middleware ทำงานก่อนทุกอย่าง ได้ 307 จริง ไปทันที
// (ด่านใน page ยังอยู่ครบ ตรงนี้แค่ตัดหน้าที่ไม่มี cookie ออกไปก่อน)
// -----------------------------------------------------------------------------

// ดูแค่ว่า "มี cookie ไหม" ไม่ได้ตรวจลายเซ็น — edge runtime ใช้ node:crypto ไม่ได้
// ไม่เป็นช่องโหว่: cookie ปลอมผ่านด่านนี้ไปตกที่ page ซึ่งตรวจ HMAC จริงอยู่แล้ว
// และ page เด้งไป /api/auth/line ซึ่งไม่ได้อยู่ใน matcher จึงไม่วนกลับมา
const SELLER_ONLY = /^\/sell(\/|$)/;
const BUYER_ONLY = /^\/orders(\/|$)/;
const BUYER_ORDER_FORM = /^\/listing\/[^/]+\/order$/;

function toLineLogin(req: NextRequest, buyer: boolean) {
  const next = req.nextUrl.pathname + req.nextUrl.search;
  const url = req.nextUrl.clone();
  url.pathname = "/api/auth/line";
  url.search = "";
  if (buyer) url.searchParams.set("buyer", "1");
  url.searchParams.set("next", next);
  return NextResponse.redirect(url);
}

function inside(n: string | null): string | null {
  return n && n.startsWith("/") && !n.startsWith("//") && !n.includes("://") ? n : null;
}

// ปลายทางที่ Rich Menu ขอมา — LINE ส่ง ?next= มาให้คนละแบบแล้วแต่ทาง
//   เปิดในแอป LINE      → ?next=/sell/orders  (ส่ง query ตรง ๆ)
//   ผ่านหน้าเว็บ liff   → ?liff.state=%3Fnext%3D%252Fsell%252Forders  (ห่อไว้ชั้นนึง)
// ไม่รองรับทั้งสองแบบ = กดปุ่มไหนก็ตกหน้าแรกของ endpoint หมด
function liffTarget(req: NextRequest): string | null {
  const sp = req.nextUrl.searchParams;

  const direct = inside(sp.get("next"));
  if (direct) return direct;

  const state = sp.get("liff.state");
  if (!state) return null;
  try {
    const inner = new URLSearchParams(state.startsWith("?") ? state.slice(1) : state);
    return inside(inner.get("next"));
  } catch {
    return null; // liff.state เพี้ยน — ปล่อยให้ใช้ pathname ตามเดิม
  }
}

// เปิดมาจากในแอป LINE → ส่งเข้าหน้า /liff ที่คุยกับ LIFF SDK เป็น
// ได้ id_token มาเลย ไม่ต้องผ่านหน้ากรอกอีเมล/รหัสผ่านของ LINE
// ทำงานได้ไม่ว่า Endpoint URL ในคอนโซลจะตั้งไว้เป็นอะไร
function toLiffLanding(req: NextRequest, role: "seller" | "buyer", target: string | null) {
  const url = req.nextUrl.clone();
  url.pathname = `/liff/${role}`;
  url.search = "";
  url.searchParams.set("next", target ?? req.nextUrl.pathname);
  return NextResponse.redirect(url);
}

export function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;

  // ---- หน้าที่ต้องล็อกอิน ----
  if (!path.startsWith("/admin")) {
    const ua = req.headers.get("user-agent") ?? "";
    const target = liffTarget(req);
    const inLineApp = target !== null || /\bLine\/\d/i.test(ua);

    const wantsSeller = SELLER_ONLY.test(path);
    const wantsBuyer = BUYER_ONLY.test(path) || BUYER_ORDER_FORM.test(path);
    const hasSeller = Boolean(req.cookies.get("tr_seller"));
    const hasBuyer = Boolean(req.cookies.get("tr_buyer"));

    if (inLineApp) {
      if (wantsSeller && !hasSeller) return toLiffLanding(req, "seller", target);
      // ปลายทางผู้ซื้ออาจเป็นหน้าแรก (Endpoint URL ของ LIFF ผู้ซื้อ) ซึ่งไม่ใช่หน้าที่ต้องล็อกอิน
      // ล็อกอินให้เลยเฉพาะตอนมี ?next= จาก Rich Menu — ไม่งั้นคนที่กดลิงก์เว็บที่แชร์
      // ในแชทจะโดนบังคับล็อกอินทั้งที่แค่อยากเข้ามาดูของ
      if (!wantsSeller && !hasBuyer && (wantsBuyer || target !== null)) {
        return toLiffLanding(req, "buyer", target);
      }

      // ล็อกอินอยู่แล้ว แต่ Rich Menu ขอหน้าอื่น — พาไปหน้านั้น
      // ไม่งั้นทุกปุ่มในเมนูจะตกที่ Endpoint URL หน้าเดียวกันหมด
      if (target && target !== path) {
        return NextResponse.redirect(new URL(target, req.nextUrl.origin));
      }
      return NextResponse.next();
    }

    if (wantsSeller && !hasSeller) return toLineLogin(req, false);
    if (wantsBuyer && !hasBuyer) return toLineLogin(req, true);
    return NextResponse.next();
  }

  // ---- /admin ----
  // ถ้าไม่ได้ตั้ง ADMIN_KEY → ปิดตายบน production (fail closed)
  // เปิดโหมด demo ได้เฉพาะตอน dev เท่านั้น — env หายบน production ต้องไม่เท่ากับเปิดให้ทุกคน
  const adminKey = process.env.ADMIN_KEY;

  if (!adminKey) {
    if (process.env.NODE_ENV !== "production") return NextResponse.next(); // dev demo
    const url = req.nextUrl.clone();
    url.pathname = "/admin-gate";
    return NextResponse.redirect(url);
  }

  if (path === "/admin-gate") return NextResponse.next();

  const ok = req.cookies.get("admin_ok")?.value === adminKey;
  if (!ok) {
    const url = req.nextUrl.clone();
    url.pathname = "/admin-gate";
    url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin",
    "/admin/:path*",
    "/sell",
    "/sell/:path*",
    "/orders",
    "/orders/:path*",
    "/listing/:id/order",
    // หน้าแรกอยู่ในนี้เพราะเป็น Endpoint URL ของ LIFF ผู้ซื้อ — ต้องดักตอนมาจาก LIFF
    // เข้าหน้าแรกปกติแค่เช็ค 2 ค่าแล้วผ่าน ไม่หน่วง
    "/",
  ],
};
