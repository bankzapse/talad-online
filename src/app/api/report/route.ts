import { NextResponse } from "next/server";
import { reportListing, hasReported } from "@/lib/data";
import { getBuyerKey } from "@/lib/auth";

// รายงานประกาศ — ต้องล็อกอินและนับ 1 คน = 1 ครั้งต่อประกาศ
// ไม่งั้นยิง 3 ครั้งก็ปลดประกาศคู่แข่งออกจากเว็บได้ (report_count ครบ 3 → เข้าคิวตรวจ)
export async function POST(req: Request) {
  const buyerKey = await getBuyerKey();
  if (!buyerKey) return NextResponse.json({ error: "login_required" }, { status: 401 });

  const { listingId, reason } = await req.json();
  if (!listingId || typeof listingId !== "string" || !reason || typeof reason !== "string") {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  if (await hasReported(listingId, buyerKey)) {
    return NextResponse.json({ error: "already_reported" }, { status: 429 });
  }

  await reportListing(listingId, reason.slice(0, 200), buyerKey);
  return NextResponse.json({ ok: true });
}
