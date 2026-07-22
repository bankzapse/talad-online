import Link from "next/link";
import { signInUrl } from "@/lib/url";
import { redirect } from "next/navigation";
import { getBuyerKey } from "@/lib/auth";
import { getBuyerOrders, getSeller } from "@/lib/data";
import { formatPrice, timeAgo } from "@/lib/format";
import { ORDER_STATUS, DELIVERY_METHODS } from "@/lib/types";
import type { Unit } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function BuyerOrders({
  searchParams,
}: {
  searchParams: Promise<{ placed?: string; dup?: string; cancelled?: string; error?: string }>;
}) {
  const buyerKey = await getBuyerKey();
  if (!buyerKey) redirect(signInUrl({ buyer: true, next: "/orders" }));
  const sp = await searchParams;
  const orders = await getBuyerOrders(buyerKey!);
  // ดึงข้อมูลร้านไว้แสดงช่องทางติดต่อ — ถ้าร้านสมาชิกหมด ประกาศจะหาย
  // ผู้ซื้อที่มีออร์เดอร์ค้างต้องยังติดต่อร้านได้อยู่
  const shops = new Map(
    await Promise.all(
      [...new Set(orders.map((o) => o.sellerId))].map(
        async (id) => [id, await getSeller(id)] as const
      )
    )
  );

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-4 text-xl font-bold">รายการสั่งซื้อของฉัน</h1>

      {sp.placed === "1" && (
        <div className="mb-4 rounded-lg border border-brand/30 bg-brand-light p-3 text-sm text-brand-dark">
          ✓ ส่งคำสั่งซื้อแล้ว — รอร้านยืนยัน
        </div>
      )}
      {sp.dup === "1" && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
          คุณมีคำสั่งซื้อสินค้านี้ที่ยังไม่จบอยู่แล้ว — รอร้านยืนยันก่อนสั่งใหม่
        </div>
      )}
      {sp.cancelled === "1" && (
        <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-500">
          ยกเลิกคำสั่งซื้อแล้ว — ระบบแจ้งร้านให้ทราบแล้ว
        </div>
      )}

      {orders.length === 0 ? (
        <div className="card p-10 text-center text-slate-400">
          ยังไม่มีรายการสั่งซื้อ —{" "}
          <Link href="/" className="text-brand underline">
            เลือกซื้อสินค้า
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((o) => {
            const st = ORDER_STATUS[o.status];
            const dm = DELIVERY_METHODS.find((d) => d.value === o.deliveryMethod);
            return (
              <Link key={o.id} href={`/orders/${o.id}`} className="card block p-4 transition hover:shadow-lift">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-medium text-ink">{o.listingTitle}</div>
                    <div className="mt-0.5 text-sm text-slate-500">
                      {formatPrice(o.price, (o.unit ?? "ชิ้น") as Unit)} × {o.qty} · {dm?.short}
                    </div>
                    <div className="mt-0.5 text-xs text-slate-400">
                      สั่งเมื่อ {timeAgo(o.createdAt)}
                    </div>
                  </div>
                  <span className={`chip shrink-0 ${st.cls}`}>{st.text}</span>
                </div>

                {o.trackingNo && (
                  <div className="mt-3 rounded-lg border border-blue-200 bg-blue-50 p-2 text-sm text-blue-700">
                    📦 เลขพัสดุ: <b>{o.trackingNo}</b>
                    {o.carrier && ` · ${o.carrier}`}
                  </div>
                )}
                {o.status === "cancelled" && o.cancelReason && (
                  <div className="mt-3 rounded-lg bg-red-50 p-2 text-sm text-red-600">
                    เหตุผลที่ยกเลิก: {o.cancelReason}
                  </div>
                )}
                {o.address && (
                  <div className="mt-2 text-xs text-slate-400">📍 ส่งที่: {o.address}</div>
                )}

                <div className="mt-3 border-t border-slate-100 pt-2 text-xs text-brand-dark">
                  ดูรายละเอียด / ติดต่อร้าน →
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
