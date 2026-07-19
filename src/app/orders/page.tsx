import Link from "next/link";
import { redirect } from "next/navigation";
import { getBuyerKey } from "@/lib/auth";
import { getBuyerOrders } from "@/lib/data";
import { formatPrice, timeAgo } from "@/lib/format";
import { ORDER_STATUS, DELIVERY_METHODS } from "@/lib/types";
import type { Unit } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function BuyerOrders({
  searchParams,
}: {
  searchParams: Promise<{ placed?: string }>;
}) {
  const buyerKey = await getBuyerKey();
  if (!buyerKey) redirect("/login?buyer=1&next=/orders");
  const sp = await searchParams;
  const orders = await getBuyerOrders(buyerKey!);

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-4 text-xl font-bold">รายการสั่งซื้อของฉัน</h1>

      {sp.placed === "1" && (
        <div className="mb-4 rounded-lg border border-brand/30 bg-brand-light p-3 text-sm text-brand-dark">
          ✓ ส่งคำสั่งซื้อแล้ว — รอร้านยืนยัน คุณจะได้รับแจ้งเตือนทาง LINE
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
              <div key={o.id} className="card p-4">
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
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
