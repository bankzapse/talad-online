import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { upsertSellerFromLine } from "@/lib/data";
import { linkSellerRichMenu } from "@/lib/line";
import { SESSION_COOKIE, BUYER_COOKIE } from "@/lib/auth";
import { createSessionToken } from "@/lib/session";
import { isLiffRole } from "@/lib/liff";

// แลก id_token จาก LIFF เป็น session cookie ของเรา
//
// ห้ามเชื่อ userId ที่ client ส่งมาเด็ดขาด — ใครก็ยิง fetch ใส่ endpoint นี้ได้
// ต้องเอา id_token ไปให้ LINE ยืนยันก่อน แล้วใช้ `sub` ที่ LINE คืนมาเท่านั้น
export async function POST(req: Request) {
  let body: { idToken?: string; role?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, reason: "bad_body" }, { status: 400 });
  }

  const { idToken, role } = body;
  if (!idToken || !role || !isLiffRole(role)) {
    return NextResponse.json({ ok: false, reason: "bad_request" }, { status: 400 });
  }

  const clientId = process.env.LINE_LOGIN_CHANNEL_ID;
  if (!clientId) {
    return NextResponse.json({ ok: false, reason: "not_configured" }, { status: 503 });
  }

  // LINE ตรวจลายเซ็น + อายุ + ว่าออกให้ channel นี้จริงไหม
  const res = await fetch("https://api.line.me/oauth2/v2.1/verify", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ id_token: idToken, client_id: clientId }),
  });
  if (!res.ok) {
    return NextResponse.json({ ok: false, reason: "invalid_token" }, { status: 401 });
  }

  const claims = (await res.json()) as { sub?: string; name?: string };
  const userId = claims.sub;
  if (!userId || !userId.startsWith("U")) {
    return NextResponse.json({ ok: false, reason: "no_sub" }, { status: 401 });
  }

  const jar = await cookies();
  const opts = {
    httpOnly: true,
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
    sameSite: "lax" as const,
  };

  if (role === "buyer") {
    jar.set(BUYER_COOKIE, createSessionToken(userId), opts);
    return NextResponse.json({ ok: true });
  }

  const seller = await upsertSellerFromLine(userId, claims.name ?? "ผู้ขาย");
  jar.set(SESSION_COOKIE, createSessionToken(seller.id), opts);
  void linkSellerRichMenu(userId); // สลับเมนูในแชทเป็นเมนูผู้ขาย ล้มเหลวก็ไม่กระทบ

  // ร้านใหม่ยังไม่มีชื่อร้าน → ให้ฝั่ง client พาไปกรอกข้อมูลร้านก่อน
  return NextResponse.json({ ok: true, needsProfile: !seller.shopName });
}
