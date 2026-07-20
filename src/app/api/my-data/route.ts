import { NextResponse } from "next/server";
import { getCurrentSeller, getBuyerKey } from "@/lib/auth";
import { exportSellerData, exportBuyerData } from "@/lib/pdpa";

// ดาวน์โหลดสำเนาข้อมูลส่วนบุคคลของตัวเอง (สิทธิเข้าถึงข้อมูลตาม PDPA)
// ให้เฉพาะข้อมูลของ session ที่ล็อกอินอยู่เท่านั้น — ไม่รับ id จาก query
export async function GET(req: Request) {
  const role = new URL(req.url).searchParams.get("role");

  if (role === "buyer") {
    const buyerKey = await getBuyerKey();
    if (!buyerKey) return NextResponse.json({ error: "login_required" }, { status: 401 });
    const data = await exportBuyerData(buyerKey);
    return fileResponse(data, "ข้อมูลผู้ซื้อ");
  }

  const seller = await getCurrentSeller();
  if (!seller) return NextResponse.json({ error: "login_required" }, { status: 401 });
  const data = await exportSellerData(seller.id);
  if (!data) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return fileResponse(data, "ข้อมูลผู้ขาย");
}

function fileResponse(data: unknown, label: string) {
  const stamp = new Date().toISOString().slice(0, 10);
  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename*=UTF-8''${encodeURIComponent(
        `talad-online-${label}-${stamp}.json`
      )}`,
      "cache-control": "no-store",
    },
  });
}
