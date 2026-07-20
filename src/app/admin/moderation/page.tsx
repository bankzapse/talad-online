import AdminNav from "@/components/AdminNav";
import { getModerationQueue, getSellers, getCategories } from "@/lib/data";
import { timeAgo, formatPrice, formatStock } from "@/lib/format";
import { moderateAction, rejectListingAction } from "@/app/actions";
import SubmitButton from "@/components/SubmitButton";
import { DELIVERY_METHODS, LISTING_STATUS } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function Moderation() {
  const [queue, sellers, categories] = await Promise.all([
    getModerationQueue(),
    getSellers(),
    getCategories(),
  ]);
  const sellerMap = new Map(sellers.map((s) => [s.id, s]));
  const catMap = new Map(categories.map((c) => [c.id, c]));

  return (
    <div>
      <h1 className="mb-4 text-xl font-bold">คิวตรวจประกาศ</h1>
      <AdminNav active="moderation" />

      <p className="mb-3 text-sm text-slate-500">
        <b>ทุกประกาศต้องผ่านการอนุมัติที่นี่ก่อนแสดงต่อผู้ซื้อ</b> — ผู้ขายกดส่งขออนุมัติแล้วเข้าคิวนี้
        รวมถึงประกาศที่ติดคำต้องห้ามหรือถูกผู้ใช้รายงาน
        <br />
        กดที่รูปเพื่อเปิดดูขนาดเต็มก่อนตัดสินใจ
      </p>

      {queue.length === 0 ? (
        <div className="card p-10 text-center text-slate-400">✓ ไม่มีประกาศค้างตรวจ</div>
      ) : (
        <div className="space-y-3">
          {queue.map((l) => {
            const seller = sellerMap.get(l.sellerId);
            const cat = catMap.get(l.categoryId);
            const dm = DELIVERY_METHODS.find((d) => d.value === l.deliveryMethod);
            const st = LISTING_STATUS[l.status];
            const approve = moderateAction.bind(null, l.id, "approve");
            const remove = moderateAction.bind(null, l.id, "remove");
            const reject = rejectListingAction.bind(null, l.id);

            return (
              <div key={l.id} className="card p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-semibold text-ink">{l.title}</div>
                    <div className="mt-0.5 text-sm text-brand-dark">
                      {formatPrice(l.price, l.unit)}
                      {l.stock !== null && (
                        <span className="text-slate-400">
                          {" · "}
                          {formatStock(l.stock, l.unit)}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className={`chip shrink-0 ${st.cls}`}>{st.text}</span>
                </div>

                {/* ---- รูปสินค้า: สิ่งที่ต้องดูก่อนอนุมัติ ---- */}
                <div className="mt-3">
                  {l.images.length === 0 ? (
                    <div className="flex h-24 items-center justify-center rounded-lg border border-dashed border-slate-300 text-sm text-slate-400">
                      {cat?.emoji} ประกาศนี้ไม่มีรูปสินค้า
                    </div>
                  ) : (
                    <>
                      <div className="flex gap-2 overflow-x-auto pb-1">
                        {l.images.map((src, i) => (
                          <a
                            key={src}
                            href={src}
                            target="_blank"
                            rel="noreferrer"
                            title="เปิดดูขนาดเต็ม"
                            className="relative shrink-0 overflow-hidden rounded-lg border border-slate-200 hover:border-brand"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={src} alt="" className="h-28 w-28 object-cover" />
                            {i === 0 && (
                              <span className="absolute left-1 top-1 rounded bg-brand px-1 text-[9px] text-white">
                                ปก
                              </span>
                            )}
                          </a>
                        ))}
                      </div>
                      <div className="mt-1 text-xs text-slate-400">
                        {l.images.length} รูป · คลิกที่รูปเพื่อดูขนาดเต็ม
                      </div>
                    </>
                  )}
                </div>

                {/* ---- รายละเอียดเต็ม ---- */}
                <p className="mt-3 whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
                  {l.description || <span className="text-slate-400">(ไม่มีรายละเอียด)</span>}
                </p>

                <div className="mt-3 flex flex-wrap gap-1.5 text-xs">
                  <span className="chip border-slate-200 bg-slate-50 text-slate-600">
                    {cat?.emoji} {cat?.name}
                  </span>
                  <span className="chip border-slate-200 bg-slate-50 text-slate-600">
                    📍 {l.marketName} · {l.subdistrict} {l.district} {l.province}
                  </span>
                  <span
                    className={`chip ${
                      l.deliveryMethod === "meetup" || l.deliveryMethod === "cod"
                        ? "border-brand/25 bg-brand-soft text-brand-dark"
                        : "border-gold/40 bg-gold-light text-[#7a5c1f]"
                    }`}
                  >
                    {dm?.short}
                  </span>
                  <span className="chip border-slate-200 bg-slate-50 text-slate-400">
                    ลงเมื่อ {timeAgo(l.createdAt)}
                  </span>
                </div>

                {/* ---- ร้านที่ลงประกาศ ---- */}
                <div className="mt-3 rounded-lg border border-slate-200 p-3 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-slate-700">
                      🏪 {seller?.shopName ?? seller?.displayName ?? "—"}
                    </span>
                    {seller?.companyVerified && (
                      <span className="chip border-gold/40 bg-gold-light text-[10px] text-[#7a5c1f]">
                        ✓ ยืนยันกับบริษัท
                      </span>
                    )}
                    {seller?.phoneVerified && (
                      <span className="chip border-brand/30 bg-brand-light text-[10px] text-brand-dark">
                        ✓ ยืนยันเบอร์
                      </span>
                    )}
                    {seller?.blocked && (
                      <span className="chip border-red-200 bg-red-50 text-[10px] text-red-600">
                        ⛔ ร้านถูกระงับ
                      </span>
                    )}
                  </div>
                  <div className="mt-1 text-xs text-slate-400">
                    📞 {seller?.contactPhone ?? "—"}
                    {seller?.lineId && ` · LINE ${seller.lineId}`}
                  </div>
                </div>

                {/* ---- สัญญาณเตือน ---- */}
                {(l.flaggedKeywords.length > 0 || l.reportCount > 0) && (
                  <div className="mt-3 flex flex-wrap gap-1">
                    {l.flaggedKeywords.map((k) => (
                      <span key={k} className="chip border-red-200 bg-red-50 text-red-600">
                        ⚠️ คำต้องห้าม: {k}
                      </span>
                    ))}
                    {l.reportCount > 0 && (
                      <span className="chip border-amber-200 bg-amber-50 text-amber-600">
                        ถูกรายงาน {l.reportCount} ครั้ง
                      </span>
                    )}
                  </div>
                )}

                {/* ---- ปุ่มตัดสิน ---- */}
                <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
                  <form action={approve}>
                    <SubmitButton
                      className="btn-primary px-4 py-1.5 text-sm"
                      pendingText="กำลังอนุมัติ…"
                    >
                      ✓ อนุมัติ — แสดงเลย
                    </SubmitButton>
                  </form>
                  <form action={reject} className="flex min-w-[14rem] flex-1 gap-1">
                    <input
                      name="note"
                      placeholder="เหตุผลที่ตีกลับ (ผู้ขายจะเห็น)"
                      className="input flex-1 py-1 text-sm"
                    />
                    <SubmitButton className="btn-outline px-3 py-1.5 text-sm">
                      ↩ ตีกลับให้แก้
                    </SubmitButton>
                  </form>
                  <form action={remove}>
                    <SubmitButton className="btn bg-red-500 px-3 py-1.5 text-sm text-white hover:bg-red-600">
                      ⛔ ระงับถาวร
                    </SubmitButton>
                  </form>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
