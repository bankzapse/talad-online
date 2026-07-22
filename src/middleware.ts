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

export function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;

  // ---- หน้าที่ต้องล็อกอิน ----
  if (!path.startsWith("/admin")) {
    if (SELLER_ONLY.test(path) && !req.cookies.get("tr_seller")) {
      return toLineLogin(req, false);
    }
    if ((BUYER_ONLY.test(path) || BUYER_ORDER_FORM.test(path)) && !req.cookies.get("tr_buyer")) {
      return toLineLogin(req, true);
    }
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
  ],
};
