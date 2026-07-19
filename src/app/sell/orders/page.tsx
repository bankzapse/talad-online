import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentSeller } from "@/lib/auth";
import { getSellerOrders } from "@/lib/data";
import { formatPrice, timeAgo } from "@/lib/format";
import { ORDER_STATUS, DELIVERY_METHODS, needsShipping } from "@/lib/types";
import type { Unit } from "@/lib/types";
import {
  confirmOrderAction,
  shipOrderAction,
  completeOrderAction,
  cancelOrderAction,
} from "@/app/actions";
import SubmitButton from "@/components/SubmitButton";

export const dynamic = "force-dynamic";

export default async function SellerOrders({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; filter?: string }>;
}) {
  const seller = await getCurrentSeller();
  if (!seller) redirect("/login");
  const sp = await searchParams;

  const all = await getSellerOrders(seller!.id);
  const filter = sp.filter ?? "open";
  // "ที่ต้องจัดการ" = ยังไม่จบ (รอยืนยัน/ยืนยันแล้ว/ส่งแล้ว)
  const orders =
    filter === "all"
      ? all
      : all.filter((o) => !["completed", "cancelled"].includes(o.status));
  const pendingCount = all.filter((o) => o.status === "pending").length;

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/sell" className="mb-4 inline-block text-sm text-slate-400 hover:text-slate-600">
        ← กลับร้านของฉัน
      </Link>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-bold">
          รายการสั่งซื้อ
          {pendingCount > 0 && (
            <span className="ml-2 chip border-amber-200 bg-amber-50 text-amber-600">
              รอยืนยัน {pendingCount}
            </span>
          )}
        </h1>
        <div className="flex gap-1 text-sm">
          <Link
            href="/sell/orders?filter=open"
            className={`rounded-lg px-3 py-1.5 ${
              filter !== "all" ? "bg-brand-light font-medium text-brand-dark" : "text-slate-500 hover:bg-slate-100"
            }`}
          >
            ที่ต้องจัดการ
          </Link>
          <Link
            href="/sell/orders?filter=all"
            className={`rounded-lg px-3 py-1.5 ${
              filter === "all" ? "bg-brand-light font-medium text-brand-dark" : "text-slate-500 hover:bg-slate-100"
            }`}
          >
            ทั้งหมด ({all.length})
          </Link>
        </div>
      </div>

      {sp.error === "tracking" && (
        <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
          กรุณากรอกเลขพัสดุก่อนกดจัดส่ง (วิธีรับของแบบส่งพัสดุต้องมีเลขติดตาม)
        </div>
      )}

      {orders.length === 0 ? (
        <div className="card p-10 text-center text-slate-400">
          {filter === "all" ? "ยังไม่มีรายการสั่งซื้อ" : "✓ ไม่มีรายการค้างจัดการ"}
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((o) => {
            const st = ORDER_STATUS[o.status];
            const dm = DELIVERY_METHODS.find((d) => d.value === o.deliveryMethod);
            const shipping = needsShipping(o.deliveryMethod);
            const confirm = confirmOrderAction.bind(null, o.id);
            const ship = shipOrderAction.bind(null, o.id);
            const complete = completeOrderAction.bind(null, o.id);
            const cancel = cancelOrderAction.bind(null, o.id);
            const done = o.status === "completed" || o.status === "cancelled";

            return (
              <div key={o.id} className="card p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-semibold text-ink">{o.listingTitle}</div>
                    <div className="mt-0.5 text-sm text-slate-600">
                      {formatPrice(o.price, (o.unit ?? "ชิ้น") as Unit)} × {o.qty} ·{" "}
                      <span className="text-slate-400">{dm?.short}</span>
                    </div>
                  </div>
                  <span className={`chip shrink-0 ${st.cls}`}>{st.text}</span>
                </div>

                {/* ข้อมูลผู้ซื้อ */}
                <div className="mt-3 space-y-0.5 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
                  <div>
                    👤 {o.buyerName} · 📞{" "}
                    <a href={`tel:${o.buyerPhone}`} className="text-brand-dark underline">
                      {o.buyerPhone}
                    </a>
                  </div>
                  {o.address ? (
                    <div>📍 {o.address}</div>
                  ) : (
                    <div className="text-slate-400">🤝 นัดรับเอง — ไม่มีที่อยู่จัดส่ง</div>
                  )}
                  {o.note && <div className="text-slate-500">💬 {o.note}</div>}
                  <div className="text-xs text-slate-400">สั่งเมื่อ {timeAgo(o.createdAt)}</div>
                </div>

                {o.trackingNo && (
                  <div className="mt-2 rounded-lg border border-blue-200 bg-blue-50 p-2 text-sm text-blue-700">
                    📦 {o.carrier ? `${o.carrier} · ` : ""}
                    <b>{o.trackingNo}</b>
                  </div>
                )}
                {o.status === "cancelled" && o.cancelReason && (
                  <div className="mt-2 rounded-lg bg-red-50 p-2 text-sm text-red-600">
                    ยกเลิก: {o.cancelReason}
                  </div>
                )}

                {/* ปุ่มจัดการ */}
                {!done && (
                  <div className="mt-3 space-y-2 border-t border-slate-100 pt-3">
                    {o.status === "pending" && (
                      <div className="flex flex-wrap gap-2">
                        <form action={confirm}>
                          <SubmitButton
                            className="btn-primary px-4 py-1.5 text-sm"
                            pendingText="กำลังยืนยัน…"
                          >
                            ✓ ยืนยันรายการ
                          </SubmitButton>
                        </form>
                        <form action={cancel} className="flex flex-1 gap-1">
                          <input
                            name="reason"
                            placeholder="เหตุผลที่ยกเลิก (ถ้ามี)"
                            className="input flex-1 py-1 text-sm"
                          />
                          <SubmitButton className="btn-outline px-3 py-1.5 text-sm">
                            ยกเลิก
                          </SubmitButton>
                        </form>
                      </div>
                    )}

                    {/* ใส่เลขพัสดุ — นัดรับไม่ต้องใส่ */}
                    {(o.status === "confirmed" || o.status === "pending") && (
                      <form action={ship} className="flex flex-wrap items-end gap-2">
                        {shipping ? (
                          <>
                            <div className="w-32">
                              <label className="label">ขนส่ง</label>
                              <input
                                name="carrier"
                                className="input py-1 text-sm"
                                placeholder="Flash, ไปรษณีย์"
                              />
                            </div>
                            <div className="min-w-[9rem] flex-1">
                              <label className="label">เลขพัสดุ *</label>
                              <input
                                name="trackingNo"
                                required
                                className="input py-1 text-sm"
                                placeholder="TH123456789"
                              />
                            </div>
                            <SubmitButton
                              className="btn-primary px-4 py-1.5 text-sm"
                              pendingText="กำลังบันทึก…"
                            >
                              📦 แจ้งจัดส่ง
                            </SubmitButton>
                          </>
                        ) : (
                          <SubmitButton
                            className="btn-outline px-4 py-1.5 text-sm"
                            pendingText="กำลังแจ้ง…"
                          >
                            🤝 แจ้งว่าเตรียมของพร้อมให้มารับแล้ว
                          </SubmitButton>
                        )}
                      </form>
                    )}

                    {o.status === "shipped" && (
                      <div className="flex flex-wrap gap-2">
                        <form action={complete}>
                          <SubmitButton
                            className="btn-primary px-4 py-1.5 text-sm"
                            pendingText="กำลังปิดรายการ…"
                          >
                            ✓ ปิดรายการ (ลูกค้าได้รับแล้ว)
                          </SubmitButton>
                        </form>
                        <form action={cancel} className="flex flex-1 gap-1">
                          <input
                            name="reason"
                            placeholder="เหตุผลที่ยกเลิก"
                            className="input flex-1 py-1 text-sm"
                          />
                          <SubmitButton className="btn-outline px-3 py-1.5 text-sm">
                            ยกเลิก
                          </SubmitButton>
                        </form>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <p className="mt-4 text-xs text-slate-400">
        * ทุกครั้งที่ยืนยัน / แจ้งจัดส่ง / ยกเลิก ระบบจะแจ้งผู้ซื้อทาง LINE อัตโนมัติ
        <br />* ที่อยู่และเบอร์ผู้ซื้อเป็นข้อมูลส่วนบุคคล — ใช้เพื่อจัดส่งเท่านั้น ห้ามเผยแพร่ต่อ
      </p>
    </div>
  );
}
