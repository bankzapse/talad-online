import { NextResponse } from "next/server";
import { getBuyerKey } from "@/lib/auth";
import { tryContact, getListing, getSeller } from "@/lib/data";
import { pushToSeller } from "@/lib/line";

export async function POST(req: Request) {
  const buyerKey = await getBuyerKey();
  if (!buyerKey) {
    return NextResponse.json({ reason: "login_required" }, { status: 401 });
  }

  const { listingId } = await req.json();
  const listing = await getListing(listingId);
  if (!listing) {
    return NextResponse.json({ reason: "not_found" }, { status: 404 });
  }

  // Rate-limit ต่อผู้ซื้อ+ประกาศ (กันปั่น push + คุมต้นทุน)
  const rl = await tryContact(listingId, buyerKey);
  if (!rl.ok) {
    return NextResponse.json({ reason: rl.reason }, { status: 429 });
  }

  // ส่ง push เข้า LINE ผู้ขาย (ถ้าตั้งค่า LINE แล้ว) — ไม่งั้น log เฉยๆ
  const seller = await getSeller(listing.sellerId);
  const result = await pushToSeller(seller, `มีผู้สนใจ "${listing.title}" ของคุณ`);
  if (result === "quota_exceeded") {
    return NextResponse.json({ reason: "quota_exceeded" }, { status: 200 });
  }

  return NextResponse.json({ ok: true });
}
