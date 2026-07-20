import { NextResponse } from "next/server";
import { queryListings, getSellers, getCategories, PAGE_SIZE } from "@/lib/data";

// รายการประกาศแบบแบ่งหน้า — ใช้กับปุ่ม "โหลดเพิ่ม" หน้าแรก
// คืนเฉพาะข้อมูลที่หน้าเว็บแสดงอยู่แล้ว (สาธารณะ) ไม่มีข้อมูลส่วนบุคคล
export async function GET(req: Request) {
  const p = new URL(req.url).searchParams;
  const offset = Math.max(0, Number(p.get("offset") ?? 0) || 0);

  const opts = {
    q: p.get("q") || undefined,
    categoryId: p.get("category") || undefined,
    province: p.get("province") || undefined,
    sort: (p.get("sort") as "newest" | "price_asc" | "price_desc" | undefined) || undefined,
    limit: PAGE_SIZE,
    offset,
  };

  const [listings, sellers, categories] = await Promise.all([
    queryListings(opts),
    getSellers(),
    getCategories(),
  ]);

  const sellerMap = new Map(sellers.map((s) => [s.id, s]));
  const catMap = new Map(categories.map((c) => [c.id, c]));

  return NextResponse.json({
    items: listings.map((l) => ({
      listing: l,
      categoryName: catMap.get(l.categoryId)?.name ?? "",
      sellerVerified: Boolean(sellerMap.get(l.sellerId)?.phoneVerified),
      companyVerified: Boolean(sellerMap.get(l.sellerId)?.companyVerified),
    })),
    nextOffset: offset + listings.length,
    hasMore: listings.length === PAGE_SIZE,
  });
}
