import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentSeller } from "@/lib/auth";
import { getCategories, getAreas } from "@/lib/data";
import { UNITS } from "@/lib/types";
import { createListingAction } from "@/app/actions";
import ImageUpload from "@/components/ImageUpload";
import SubmitButton from "@/components/SubmitButton";

export const dynamic = "force-dynamic";

export default async function NewListing() {
  const seller = await getCurrentSeller();
  if (!seller) redirect("/login");

  const [categories, areas] = await Promise.all([getCategories(), getAreas()]);
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

          <div className="flex gap-3">
            <div className="flex-1">
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
            <div className="flex-1">
              <label className="label">พื้นที่/ตลาด *</label>
              <select name="areaId" required className="input" defaultValue="">
                <option value="" disabled>
                  เลือกพื้นที่
                </option>
                {areas.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.market} ({a.province})
                  </option>
                ))}
              </select>
            </div>
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
