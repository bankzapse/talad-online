import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getBuyerKey } from "@/lib/auth";
import { getOrder, getSeller } from "@/lib/data";
import { formatPrice, formatBaht, timeAgo, orderRef } from "@/lib/format";
import { ORDER_STATUS, DELIVERY_METHODS, needsShipping, needsPrepay } from "@/lib/types";
import type { Unit, OrderStatus } from "@/lib/types";
import { cancelOwnOrderAction } from "@/app/actions";
import { OA_ID, OA_ADD_FRIEND_URL } from "@/lib/line";
import SubmitButton from "@/components/SubmitButton";
import { signInUrl } from "@/lib/url";

export const dynamic = "force-dynamic";

const STEPS: { key: OrderStatus; label: string; desc: string }[] = [
  { key: "pending", label: "ส่งคำสั่งซื้อแล้ว", desc: "รอร้านตรวจสอบและยืนยัน" },
  { key: "confirmed", label: "ร้านยืนยันแล้ว", desc: "ร้านกำลังเตรียมสินค้า" },
  { key: "shipped", label: "จัดส่งแล้ว", desc: "สินค้าออกจากร้าน" },
  { key: "completed", label: "สำเร็จ", desc: "ได้รับสินค้าเรียบร้อย" },
];

export default async function OrderDetail({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ placed?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;

  const buyerKey = await getBuyerKey();
  if (!buyerKey) redirect(signInUrl({ buyer: true, next: `/orders/${id}` }));

  const order = await getOrder(id);
  // เห็นได้เฉพาะคำสั่งซื้อของตัวเอง
  if (!order || order.buyerKey !== buyerKey) notFound();

  const shop = await getSeller(order.sellerId);
  const st = ORDER_STATUS[order.status];
  const dm = DELIVERY_METHODS.find((d) => d.value === order.deliveryMethod);
  const cancelled = order.status === "cancelled";
  const stepIndex = STEPS.findIndex((s) => s.key === order.status);
  const canCancel = order.status === "pending" || order.status === "confirmed";
  const total = order.price * order.qty;

  return (
    <div className="mx-auto max-w-lg">
      {/* ---- ยืนยันว่าสั่งสำเร็จ ---- */}
      {sp.placed === "1" && (
        <div className="mb-4 rounded-2xl border border-brand/30 bg-brand-light p-6 text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-brand text-3xl text-white">
            ✓
          </div>
          <h1 className="mt-3 text-lg font-bold text-brand-dark">สั่งซื้อสำเร็จแล้ว</h1>
          <p className="mt-1 text-sm text-brand-dark/80">
            ร้านได้รับคำสั่งซื้อของคุณแล้ว — รอร้านยืนยันก่อนเตรียมของ
          </p>
          <div className="mt-3 inline-block rounded-lg bg-white/70 px-4 py-2">
            <div className="text-xs text-slate-500">เลขที่คำสั่งซื้อ</div>
            <div className="font-mono text-lg font-bold tracking-wider text-ink">
              {orderRef(order.id)}
            </div>
          </div>

          {/* ---- เข้าแชท LINE ต่อ ----
              ลิงก์ line.me/R/ti/p ใช้ได้ทุกที่: ในแอป LINE เปิดแชทเลย,
              บนมือถือเปิดแอป LINE ให้, บนคอมฯ เด้งไปแอป LINE บนเครื่อง
              ไม่ใช้ปุ่มเด้งอัตโนมัติ — ผู้ซื้อต้องได้อ่านเลขที่คำสั่งซื้อก่อน */}
          <a
            href={OA_ADD_FRIEND_URL}
            className="btn-primary mt-4 w-full py-3 text-base"
          >
            💬 เปิดแชท LINE
          </a>
          <p className="mt-2 text-xs text-brand-dark/70">
            ความคืบหน้าคำสั่งซื้อจะส่งเข้าแชท LINE — ต้องเพิ่มเพื่อน {OA_ID} ก่อนถึงจะได้รับ
          </p>
        </div>
      )}

      {!sp.placed && (
        <Link href="/orders" className="mb-4 inline-block text-sm text-slate-400 hover:text-slate-600">
          ← กลับรายการสั่งซื้อ
        </Link>
      )}

      {/* ---- สรุปรายการ ---- */}
      <div className="card p-5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="text-xs text-slate-400">
              เลขที่ <span className="font-mono font-medium">{orderRef(order.id)}</span> ·
              สั่งเมื่อ {timeAgo(order.createdAt)}
            </div>
            <h2 className="mt-1 font-semibold text-ink">{order.listingTitle}</h2>
          </div>
          <span className={`chip shrink-0 ${st.cls}`}>{st.text}</span>
        </div>

        <div className="mt-3 space-y-1 rounded-lg bg-slate-50 p-3 text-sm">
          <Row label="ราคา" value={formatPrice(order.price, (order.unit ?? "ชิ้น") as Unit)} />
          <Row label="จำนวน" value={`${order.qty}`} />
          <Row label="วิธีรับของ" value={dm?.label ?? "—"} />
          <div className="flex justify-between border-t border-slate-200 pt-1.5 font-medium text-ink">
            <span>รวมทั้งสิ้น</span>
            <span>{formatBaht(total)}</span>
          </div>
        </div>

        {/* ---- ขั้นตอน ---- */}
        {!cancelled ? (
          <ol className="mt-5 space-y-0">
            {STEPS.map((s, i) => {
              const done = i <= stepIndex;
              const current = i === stepIndex;
              return (
                <li key={s.key} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <span
                      className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs ${
                        done ? "bg-brand text-white" : "bg-slate-200 text-slate-400"
                      }`}
                    >
                      {done ? "✓" : i + 1}
                    </span>
                    {i < STEPS.length - 1 && (
                      <span className={`w-0.5 flex-1 ${i < stepIndex ? "bg-brand" : "bg-slate-200"}`} />
                    )}
                  </div>
                  <div className={`pb-4 ${done ? "" : "opacity-50"}`}>
                    <div className={`text-sm ${current ? "font-semibold text-brand-dark" : "text-slate-700"}`}>
                      {s.label}
                    </div>
                    <div className="text-xs text-slate-400">{s.desc}</div>
                  </div>
                </li>
              );
            })}
          </ol>
        ) : (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">
            คำสั่งซื้อนี้ถูกยกเลิกแล้ว
            {order.cancelReason && <div className="mt-0.5 text-xs">เหตุผล: {order.cancelReason}</div>}
          </div>
        )}

        {order.trackingNo && (
          <div className="mt-3 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-700">
            📦 เลขพัสดุ: <b className="font-mono">{order.trackingNo}</b>
            {order.carrier && ` · ${order.carrier}`}
          </div>
        )}
      </div>

      {/* ---- โอนเงินให้ร้าน ----
          ตลาดออนไลน์เป็นคนกลาง ไม่ได้รับเงินค่าสินค้า — ผู้ซื้อโอนเข้าบัญชีร้านตรง ๆ
          ก่อนร้านยืนยันยังไม่ให้โอน กันกรณีของหมดแล้วต้องมาตามเงินคืนกันเอง */}
      {needsPrepay(order.deliveryMethod) && !cancelled && (
        <div className="mt-4 card p-5">
          <h3 className="text-sm font-semibold text-ink">โอนเงินให้ร้าน</h3>

          {order.status === "pending" ? (
            <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
              ⏳ <b>ยังไม่ต้องโอน</b> — รอร้านยืนยันว่ามีของก่อน
              เลขบัญชีจะขึ้นให้ตรงนี้ทันทีที่ร้านกดยืนยัน
            </p>
          ) : shop?.bankAccountNo ? (
            <>
              <div className="mt-2 space-y-1.5 rounded-lg bg-slate-50 p-3 text-sm">
                <Row label="ธนาคาร" value={shop.bankName || "—"} />
                <Row label="เลขที่บัญชี" value={shop.bankAccountNo} mono />
                <Row label="ชื่อบัญชี" value={shop.bankAccountName || "—"} />
                <div className="flex justify-between border-t border-slate-200 pt-1.5 font-medium text-ink">
                  <span>ยอดที่ต้องโอน</span>
                  <span>{formatBaht(total)}</span>
                </div>
              </div>
              <p className="mt-2 text-xs text-slate-500">
                โอนแล้วส่งสลิปให้ร้านทางช่องทางติดต่อด้านล่าง —
                ตลาดออนไลน์ไม่ได้รับเงินค่าสินค้าและไม่ได้เป็นตัวกลางถือเงิน
              </p>
            </>
          ) : (
            <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
              ร้านยังไม่ได้ระบุบัญชีรับเงิน — <b>ทักถามร้านก่อนโอน</b> ตามช่องทางด้านล่าง
              อย่าโอนเข้าบัญชีที่ได้มาจากช่องทางอื่น
            </p>
          )}
        </div>
      )}

      {/* ---- ข้อมูลจัดส่ง ---- */}
      <div className="mt-4 card p-5">
        <h3 className="text-sm font-semibold text-ink">
          {needsShipping(order.deliveryMethod) ? "ที่อยู่จัดส่ง" : "จุดนัดรับ"}
        </h3>
        <div className="mt-2 space-y-1 text-sm text-slate-600">
          <div>👤 {order.buyerName} · 📞 {order.buyerPhone}</div>
          {order.address ? (
            <div>📍 {order.address}</div>
          ) : (
            <div className="text-slate-400">🤝 นัดรับเอง — ตกลงจุดนัดกับร้านโดยตรง</div>
          )}
          {order.note && <div className="text-slate-500">💬 {order.note}</div>}
        </div>
      </div>

      {/* ---- ติดต่อร้าน ---- */}
      <div className="mt-4 card p-5">
        <h3 className="text-sm font-semibold text-ink">ติดต่อร้าน</h3>
        <div className="mt-2 text-sm text-slate-600">
          🏪 {shop?.shopName ?? shop?.displayName ?? "ร้านค้า"}
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          {shop?.contactPhone && (
            <a href={`tel:${shop.contactPhone}`} className="btn-outline text-sm">
              📞 {shop.contactPhone}
            </a>
          )}
          {shop?.lineId && (
            <span className="btn-outline pointer-events-none text-sm">
              LINE {shop.lineId}
            </span>
          )}
        </div>
        {!shop?.contactPhone && !shop?.lineId && (
          <p className="mt-1 text-xs text-slate-400">ร้านยังไม่ได้ระบุช่องทางติดต่อ</p>
        )}
      </div>

      {canCancel && (
        <details className="mt-4 rounded-lg border border-slate-200 p-3">
          <summary className="cursor-pointer text-sm text-slate-500">ยกเลิกคำสั่งซื้อนี้</summary>
          <form action={cancelOwnOrderAction.bind(null, order.id)} className="mt-3 flex gap-1">
            <input
              name="reason"
              placeholder="เหตุผลที่ยกเลิก (ถ้ามี)"
              className="input flex-1 py-1.5 text-sm"
            />
            <SubmitButton className="btn-outline px-3 py-1.5 text-sm" pendingText="กำลังยกเลิก…">
              ยกเลิก
            </SubmitButton>
          </form>
        </details>
      )}

      <div className="mt-5 flex flex-wrap justify-center gap-2">
        <Link href="/orders" className="btn-outline text-sm">
          ดูคำสั่งซื้อทั้งหมด
        </Link>
        <Link href="/" className="btn-outline text-sm">
          เลือกซื้อสินค้าต่อ
        </Link>
      </div>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-slate-500">{label}</span>
      {/* เลขบัญชีใช้ฟอนต์ความกว้างเท่ากัน — อ่านทีละหลักตอนกดโอนไม่หลงตำแหน่ง */}
      <span className={`text-right text-slate-700 ${mono ? "font-mono font-medium tracking-wide" : ""}`}>
        {value}
      </span>
    </div>
  );
}
