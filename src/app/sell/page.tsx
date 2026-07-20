import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentSeller } from "@/lib/auth";
import { getSellerListings, getCategories, countPendingOrders } from "@/lib/data";
import { formatPrice, formatStock, daysLeft } from "@/lib/format";
import { LISTING_STATUS } from "@/lib/types";
import { setListingStatusAction, submitListingAction, logout } from "@/app/actions";
import SubmitButton from "@/components/SubmitButton";
import { TRIAL_DAYS } from "@/lib/packages";

export const dynamic = "force-dynamic";

export default async function SellHome({
  searchParams,
}: {
  searchParams: Promise<{
    verified?: string;
    saved?: string;
    deleted?: string;
    submitted?: string;
    created?: string;
    error?: string;
  }>;
}) {
  const seller = await getCurrentSeller();
  if (!seller) redirect("/login");
  const sp = await searchParams;

  const [listings, categories, pendingOrders] = await Promise.all([
    getSellerListings(seller.id),
    getCategories(),
    countPendingOrders(seller.id),
  ]);
  const catMap = new Map(categories.map((c) => [c.id, c]));
  const dleft = daysLeft(seller.membershipExpiresAt);
  const active = dleft !== null && dleft > 0;

  return (
    <div>
      {sp.verified === "1" && (
        <div className="mb-4 rounded-lg border border-brand/30 bg-brand-light p-3 text-sm text-brand-dark">
          ✓ ยืนยันเบอร์สำเร็จ! ร้านคุณได้ป้าย &ldquo;ยืนยันเบอร์แล้ว&rdquo;
        </div>
      )}
      {sp.error === "reviewing" && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
          ประกาศนี้กำลังรอทีมงานตรวจอยู่ — แก้ไขไม่ได้จนกว่าจะตรวจเสร็จ
        </div>
      )}
      {sp.error === "state" && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
          เปลี่ยนสถานะประกาศนี้ไม่ได้ — ลองรีเฟรชหน้าอีกครั้ง
        </div>
      )}
      {sp.created === "1" && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
          📝 บันทึกเป็น <b>ฉบับร่าง</b> แล้ว — กด &ldquo;ส่งขออนุมัติ&rdquo; ที่ประกาศด้านล่าง
          ทีมงานตรวจแล้วจึงจะแสดงต่อผู้ซื้อ
        </div>
      )}
      {sp.submitted === "1" && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
          📨 ส่งขออนุมัติแล้ว — ทีมงานจะตรวจสอบก่อนแสดงประกาศต่อผู้ซื้อ
        </div>
      )}
      {sp.saved === "1" && (
        <div className="mb-4 rounded-lg border border-brand/30 bg-brand-light p-3 text-sm text-brand-dark">
          ✓ บันทึกการแก้ไขประกาศแล้ว
        </div>
      )}
      {sp.deleted === "1" && (
        <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-500">
          ลบประกาศแล้ว
        </div>
      )}
      {!seller.shopName && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
          <span>🏪 ตั้งชื่อร้านให้เรียบร้อยก่อน จึงจะลงประกาศได้</span>
          <Link href="/sell/profile" className="btn-primary px-3 py-1.5 text-xs">
            ตั้งชื่อร้าน
          </Link>
        </div>
      )}
      {!seller.phoneVerified && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
          <span>📱 ยืนยันเบอร์โทรเพื่อรับป้ายน่าเชื่อถือ + กันสวมรอย</span>
          <Link href="/sell/verify-phone" className="btn-primary px-3 py-1.5 text-xs">
            ยืนยันเบอร์
          </Link>
        </div>
      )}
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">{seller.shopName ?? `ร้านของ ${seller.displayName}`}</h1>
          <div className="mt-1 text-sm">
            {active ? (
              <span className={dleft! <= 3 ? "text-red-500" : "text-brand-dark"}>
                สมาชิกเหลือ {dleft} วัน
                {dleft! <= 3 && " — ใกล้หมด ต่ออายุก่อนประกาศถูกซ่อน"}
              </span>
            ) : seller.trialUsed ? (
              <span className="text-red-500">
                สมาชิกหมดอายุ — ประกาศถูกซ่อน{" "}
                <Link href="/sell/membership" className="underline">
                  ต่ออายุ
                </Link>
              </span>
            ) : (
              <span className="text-slate-500">
                ยังไม่เริ่มทดลอง —{" "}
                <Link href="/sell/membership" className="text-brand underline">
                  เริ่มทดลองฟรี {TRIAL_DAYS} วัน
                </Link>
              </span>
            )}
          </div>
        </div>
        <form action={logout}>
          <button className="text-xs text-slate-400 hover:text-slate-600">ออกจากระบบ</button>
        </form>
      </div>

      <div className="mb-5 flex gap-2">
        <Link href="/sell/new" className="btn-primary">
          + ลงประกาศใหม่
        </Link>
        <Link href="/sell/orders" className="btn-outline">
          รายการสั่งซื้อ
          {pendingOrders > 0 && (
            <span className="ml-1 rounded-full bg-amber-100 px-1.5 text-xs text-amber-700">
              {pendingOrders}
            </span>
          )}
        </Link>
        <Link href="/sell/membership" className="btn-outline">
          สมาชิก / ต่ออายุ
        </Link>
        <Link href="/sell/profile" className="btn-outline">
          ข้อมูลร้าน
        </Link>
      </div>

      {!active && seller.trialUsed && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
          ⚠️ สมาชิกหมดอายุ ประกาศของคุณถูกซ่อนจากผู้ซื้อ (ไม่ถูกลบ) — ต่ออายุแล้วกลับมาแสดงทันที
        </div>
      )}

      <h2 className="mb-2 text-sm font-medium text-slate-500">
        ประกาศของฉัน ({listings.length})
      </h2>
      <div className="space-y-2">
        {listings.length === 0 && (
          <div className="card p-8 text-center text-slate-400">
            ยังไม่มีประกาศ กด &ldquo;ลงประกาศใหม่&rdquo; เพื่อเริ่ม
          </div>
        )}
        {listings.map((l) => {
          const cat = catMap.get(l.categoryId);
          return (
            <div key={l.id} className="card flex items-center gap-3 p-3">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-2xl">
                {cat?.emoji}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-medium">{l.title}</span>
                  {l.status === "active" && !active ? (
                    <span className="chip shrink-0 border-amber-200 bg-amber-50 text-amber-600">
                      ซ่อน–รอต่ออายุ
                    </span>
                  ) : (
                    <span className={`chip shrink-0 ${LISTING_STATUS[l.status].cls}`}>
                      {LISTING_STATUS[l.status].text}
                    </span>
                  )}
                </div>
                <div className="text-xs text-slate-400">
                  {formatPrice(l.price, l.unit)} · 📍 {l.marketName || l.province}
                  {l.stock !== null && ` · ${formatStock(l.stock, l.unit)}`}
                </div>
                {l.status === "draft" && l.reviewNote && (
                  <div className="mt-1 rounded bg-red-50 px-2 py-1 text-xs text-red-600">
                    ทีมงานไม่อนุมัติ: {l.reviewNote} — แก้ไขแล้วส่งใหม่ได้
                  </div>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <Link
                  href={`/sell/edit/${l.id}`}
                  className="btn-outline px-2 py-1 text-xs"
                >
                  แก้ไข
                </Link>
                {l.status === "draft" && (
                  <form action={submitListingAction.bind(null, l.id)}>
                    <SubmitButton
                      className="btn-primary px-2 py-1 text-xs"
                      pendingText="กำลังส่ง…"
                    >
                      ส่งขออนุมัติ
                    </SubmitButton>
                  </form>
                )}
                {l.status === "active" && (
                  <form action={setListingStatusAction.bind(null, l.id, "sold")}>
                    <SubmitButton className="btn-outline px-2 py-1 text-xs">ขายแล้ว</SubmitButton>
                  </form>
                )}
                {l.status === "sold" && (
                  <form action={setListingStatusAction.bind(null, l.id, "active")}>
                    <SubmitButton className="btn-outline px-2 py-1 text-xs">เปิดขายอีก</SubmitButton>
                  </form>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
