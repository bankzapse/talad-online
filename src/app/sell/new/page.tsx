import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentSeller } from "@/lib/auth";
import { getCategories } from "@/lib/data";
import { getProvinces } from "@/lib/geo";
import { UNITS, DELIVERY_METHODS } from "@/lib/types";
import { createListingAction } from "@/app/actions";
import ImageUpload from "@/components/ImageUpload";
import LocationPicker from "@/components/LocationPicker";
import SubmitButton from "@/components/SubmitButton";

export const dynamic = "force-dynamic";

export default async function NewListing({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const seller = await getCurrentSeller();
  if (!seller) redirect("/login");
  // ต้องกรอกข้อมูลร้าน (ชื่อร้าน) ให้เสร็จก่อน
  if (!seller.shopName) redirect("/sell/profile?next=/sell/new");
  const sp = await searchParams;

  const categories = await getCategories();
  const provinces = getProvinces();
  const action = createListingAction.bind(null, seller.id);

  return (
    <div className="mx-auto max-w-lg">
      <Link href="/sell" className="mb-4 inline-block text-sm text-slate-400 hover:text-slate-600">
        ← กลับร้านของฉัน
      </Link>
      <div className="card p-5">
        <h1 className="text-lg font-bold">ลงประกาศใหม่</h1>
        <p className="mt-1 text-xs text-slate-400">
          (จริงจะเป็นฟอร์ม LIFF ในแอป LINE — ที่นี่คือฟอร์มเว็บเทียบเท่า)
        </p>

        {sp.error === "prepay" && (
          <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
            วิธีรับของที่ต้องโอนก่อน ใช้ได้เฉพาะร้านที่ยืนยันกับบริษัทแล้ว
          </div>
        )}
        {sp.error === "required" && (
          <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
            กรอกข้อมูลที่จำเป็นให้ครบ (ชื่อสินค้า / หมวด / ชื่อตลาด)
          </div>
        )}
        {sp.error === "area" && (
          <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
            กรุณาเลือก จังหวัด / อำเภอ / ตำบล ให้ครบ
          </div>
        )}

        <form action={action} className="mt-4 space-y-3">
          <div>
            <label className="label">ชื่อสินค้า *</label>
            <input name="title" required className="input" placeholder="เช่น ผักบุ้งไทยสด" />
          </div>

          <div>
            <label className="label">รายละเอียด</label>
            <textarea name="description" rows={3} className="input" placeholder="ความสด แหล่งที่มา ฯลฯ" />
          </div>

          <div>
            <label className="label">รูปสินค้า</label>
            <ImageUpload />
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <label className="label">ราคา *</label>
              <input name="price" type="number" min="0" required className="input" placeholder="0" />
            </div>
            <div className="w-32">
              <label className="label">หน่วย *</label>
              <select name="unit" className="input" defaultValue="บาท/กก.">
                {UNITS.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="label">หมวด *</label>
            <select name="categoryId" required className="input" defaultValue="">
              <option value="" disabled>
                เลือกหมวด
              </option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.emoji} {c.name}
                </option>
              ))}
            </select>
          </div>

          <LocationPicker provinces={provinces} />

          <div>
            <label className="label">วิธีรับของ *</label>
            <select name="deliveryMethod" className="input" defaultValue="meetup">
              {DELIVERY_METHODS.filter(
                (d) => !d.requiresCompanyVerified || seller.companyVerified
              ).map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-slate-400">
              แนะนำ &ldquo;นัดรับ&rdquo; หรือ &ldquo;COD&rdquo; เพื่อความปลอดภัยของผู้ซื้อ (ไม่ต้องโอนล่วงหน้า)
            </p>
            {!seller.companyVerified && (
              <p className="mt-1 rounded-lg bg-slate-50 p-2 text-xs text-slate-500">
                🔒 ตัวเลือกที่ผู้ซื้อต้อง<b>โอนก่อน</b> (ส่งพัสดุ / โอนเงินก่อนรับสินค้า)
                ใช้ได้เฉพาะร้านที่ยืนยันตัวตนกับบริษัทแล้ว —
                ติดต่อทีมงานที่หน้า <a href="/help" className="underline">ช่วยเหลือ</a> เพื่อขอยืนยันร้าน
              </p>
            )}
          </div>

          <p className="rounded-lg bg-slate-50 p-2 text-xs text-slate-500">
            ห้ามลงสินค้าต้องห้าม (ยา/อาวุธ/เหล้า/บุหรี่/ของผิดกฎหมาย ฯลฯ) — ระบบตรวจคำต้องห้ามอัตโนมัติ
            ประกาศที่เข้าข่ายจะถูกส่งให้ทีมงานตรวจก่อนแสดง
          </p>

          <SubmitButton className="btn-primary w-full py-3" pendingText="กำลังลงประกาศ…">
            ลงประกาศ
          </SubmitButton>
        </form>
      </div>
    </div>
  );
}
