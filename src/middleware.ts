import { NextResponse, type NextRequest } from "next/server";

// ป้องกันหน้า /admin
// ถ้าไม่ได้ตั้ง ADMIN_KEY → ปิดตายบน production (fail closed)
// เปิดโหมด demo ได้เฉพาะตอน dev เท่านั้น — env หายบน production ต้องไม่เท่ากับเปิดให้ทุกคน
export function middleware(req: NextRequest) {
  const adminKey = process.env.ADMIN_KEY;
  const path = req.nextUrl.pathname;

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
  matcher: ["/admin/:path*", "/admin"],
};
