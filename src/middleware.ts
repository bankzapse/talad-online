import { NextResponse, type NextRequest } from "next/server";

// ป้องกันหน้า /admin — เปิดใช้เมื่อกำหนด ADMIN_KEY (ไม่งั้นเปิดโหมด demo)
export function middleware(req: NextRequest) {
  const adminKey = process.env.ADMIN_KEY;
  if (!adminKey) return NextResponse.next(); // demo — ไม่ล็อก

  const path = req.nextUrl.pathname;
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
