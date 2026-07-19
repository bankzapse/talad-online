import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getCurrentSeller } from "@/lib/auth";
import { getCategories, getListing } from "@/lib/data";
import { getProvinces, findGeoIds } from "@/lib/geo";
import { UNITS, DELIVERY_METHODS } from "@/lib/types";
import { updateListingAction, deleteListingAction } from "@/app/actions";
import ImageUpload from "@/components/ImageUpload";
import LocationPicker from "@/components/LocationPicker";
import SubmitButton from "@/components/SubmitButton";

export const dynamic = "force-dynamic";

const ERR: Record<string, string> = {
  prepay: "วิธีรับของที่ต้องโอนก่อน ใช้ได้เฉพาะร้านที่ยืนยันกับบริษัทแล้ว",
  required: "กรอกข้อมูลที่จำเป็นให้ครบ (ชื่อสินค้า / หมวด / ชื่อตลาด)",
  area: "กรุณาเลือก จังหวัด / อำเภอ / ตำบล ให้ครบ",
  price: "ราคาไม่ถูกต้อง",
};

export default async function EditListing({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const seller = await getCurrentSeller();
  if (!seller) redirect("/login");
  const { id } = await params;
  const sp = await searchParams;

  const listing = await getListing(id);
  // เจ้าของเท่านั้น — ประกาศคนอื่นให้เป็น 404 (ไม่เผยว่ามีอยู่จริง)
  if (!listing || listing.sellerId !== seller!.id) notFound();

  const categories = await getCategories();
  const provinces = getProvinces();
  const geoIds = findGeoIds(listing!.province, listing!.district, listing!.subdistrict);
  const action = updateListingAction.bind(null, listing!.id);
  const del = deleteListingAction.bind(null, listing!.id);

  return (
    <div className="mx-auto max-w-lg">
      <Link href="/sell" className="mb-4 inline-block text-sm text-slate-400 hover:text-slate-600">
        ← กลับร้านของฉัน
      </Link>
      <div className="card p-5">
        <h1 className="text-lg font-bold">แก้ไขประกาศ</h1>

        {sp.error && (
          <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
            {ERR[sp.error] ?? "เกิดข้อผิดพลาด"}
          </div>
        )}
        {!geoIds && (
          <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
            ประกาศนี้ยังไม่มีข้อมูลจังหวัด/อำเภอ/ตำบล — กรุณาเลือกใหม่ก่อนบันทึก
          </div>
        )}

        <form action={action} className="mt-4 space-y-3">
          <div>
            <label className="label">ชื่อสินค้า *</label>
            <input name="title" required defaultValue={listing!.title} className="input" />
          </div>

          <div>
            <label className="label">รายละเอียด</label>
            <textarea
              name="description"
              rows={3}
              defaultValue={listing!.description}
              className="input"
            />
          </div>

          <div>
            <label className="label">รูปสินค้า</label>
            <ImageUpload initial={listing!.images} />
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <label className="label">ราคา *</label>
              <input
                name="price"
                type="number"
                min="0"
                required
                defaultValue={listing!.price}
                className="input"
              />
            </div>
            <div className="w-32">
              <label className="label">หน่วย *</label>
              <select name="unit" className="input" defaultValue={listing!.unit}>
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
            <select
              name="categoryId"
              required
              className="input"
              defaultValue={listing!.categoryId}
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.emoji} {c.name}
                </option>
              ))}
            </select>
          </div>

          <LocationPicker
            provinces={provinces}
            initial={
              geoIds ? { ...geoIds, marketName: listing!.marketName } : undefined
            }
          />

          <div>
            <label className="label">วิธีรับของ *</label>
            <select
              name="deliveryMethod"
              className="input"
              defaultValue={listing!.deliveryMethod}
            >
              {DELIVERY_METHODS.filter(
                (d) => !d.requiresCompanyVerified || seller!.companyVerified
              ).map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </select>
          </div>

          <p className="rounded-lg bg-slate-50 p-2 text-xs text-slate-500">
            แก้ข้อความแล้วระบบจะตรวจคำต้องห้ามใหม่อีกครั้ง —
            ถ้าเข้าข่ายจะถูกส่งให้ทีมงานตรวจก่อนแสดงอีกรอบ
          </p>

          <SubmitButton className="btn-primary w-full py-3" pendingText="กำลังบันทึก…">
            บันทึกการแก้ไข
          </SubmitButton>
        </form>
      </div>

      {/* ลบประกาศ — แยกฟอร์มออกมา กันกดพลาดตอนกำลังแก้ไข */}
      <div className="mt-4 card border-red-100 p-4">
        <div className="text-sm font-medium text-slate-700">ลบประกาศนี้</div>
        <p className="mt-1 text-xs text-slate-500">
          ลบแล้วกู้คืนไม่ได้ — ถ้าแค่อยากพักการขาย ใช้ปุ่ม &ldquo;ขายแล้ว&rdquo; ที่หน้าร้านแทน
        </p>
        <form action={del} className="mt-3">
          <SubmitButton
            className="btn w-full border border-red-200 py-2 text-sm text-red-600 hover:bg-red-50"
            pendingText="กำลังลบ…"
          >
            ลบประกาศถาวร
          </SubmitButton>
        </form>
      </div>
    </div>
  );
}
