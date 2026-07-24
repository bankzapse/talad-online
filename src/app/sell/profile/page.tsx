import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentSeller } from "@/lib/auth";
import { saveShopProfileAction } from "@/app/actions";
import SubmitButton from "@/components/SubmitButton";
import DocUpload from "@/components/DocUpload";
import { safeNext, signInUrl } from "@/lib/url";
import { VERIFY_LABEL } from "@/lib/types";
import { THAI_BANKS } from "@/lib/banks";
import LocationPicker from "@/components/LocationPicker";
import { getProvinces, findGeoIds, getDistricts, getSubdistricts } from "@/lib/geo";

export const dynamic = "force-dynamic";

const ERR: Record<string, string> = {
  name: "กรุณากรอกชื่อร้าน (อย่างน้อย 2 ตัวอักษร)",
  phone: "กรุณากรอกเบอร์ติดต่อให้ถูกต้อง (มือถือ 10 หลัก)",
  area: "กรุณาเลือก จังหวัด / อำเภอ / ตำบล ของร้านให้ครบ",
  market: "กรุณากรอกชื่อตลาด / จุดนัดรับของร้าน",
  db: "บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง",
};

export default async function ShopProfile({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string; saved?: string; welcome?: string }>;
}) {
  const seller = await getCurrentSeller();
  if (!seller) redirect(signInUrl({ next: "/sell/profile" }));
  const sp = await searchParams;
  const next = safeNext(sp.next, "/sell");
  const isFirstTime = !seller.shopName;
  const provinces = getProvinces();
  // เติมที่ตั้งเดิมของร้านให้ dropdown (ถ้าเคยตั้งไว้)
  const shopGeo =
    seller.province && seller.district && seller.subdistrict
      ? findGeoIds(seller.province, seller.district, seller.subdistrict)
      : null;
  const shopDistricts = shopGeo ? getDistricts(shopGeo.provinceId) : [];
  const shopSubdistricts = shopGeo ? getSubdistricts(shopGeo.districtId) : [];
  const vs = VERIFY_LABEL[seller.verifyStatus];

  return (
    <div className="mx-auto max-w-lg">
      <Link href="/sell" className="text-sm text-slate-400 hover:text-slate-600">
        ← กลับร้านของฉัน
      </Link>

      <div className="mt-4 card p-6">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h1 className="text-lg font-bold">ข้อมูลร้านค้า</h1>
            <p className="mt-1 text-sm text-slate-500">
              {isFirstTime ? "กรอกข้อมูลร้านให้เรียบร้อยก่อนลงประกาศ" : "แก้ไขข้อมูลร้านของคุณ"}
            </p>
          </div>
          <span className={`chip shrink-0 ${vs.cls}`}>{vs.text}</span>
        </div>

        {sp.welcome === "1" && (
          <div className="mt-3 rounded-lg border border-brand/30 bg-brand-light p-3 text-sm text-brand-dark">
            🎉 ยินดีต้อนรับ! เหลืออีกขั้นตอนเดียว — กรอก<b>ชื่อร้าน</b>กับ<b>เบอร์ติดต่อ</b>
            แล้วลงประกาศขายได้เลย
          </div>
        )}
        {seller.verifyStatus === "rejected" && seller.verifyNote && (
          <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">
            เหตุผล: {seller.verifyNote}
          </div>
        )}
        {sp.saved === "1" && (
          <div className="mt-3 rounded-lg border border-brand/30 bg-brand-light p-3 text-sm text-brand-dark">
            ✓ บันทึกข้อมูลร้านแล้ว
          </div>
        )}
        {isFirstTime && next.includes("/sell/new") && (
          <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
            📌 ต้องกรอกชื่อร้านและเบอร์ติดต่อก่อนลงประกาศ
          </div>
        )}
        {sp.error && (
          <div className="mt-3 rounded-lg bg-red-50 p-2 text-center text-xs text-red-600">
            {ERR[sp.error] ?? "เกิดข้อผิดพลาด"}
          </div>
        )}

        <form action={saveShopProfileAction} className="mt-5 space-y-4">
          <input type="hidden" name="next" value={next} />

          {/* ---- ข้อมูลพื้นฐาน (บังคับ) ---- */}
          <div>
            <label className="label">ชื่อร้าน *</label>
            <input
              name="shopName"
              required
              minLength={2}
              maxLength={60}
              defaultValue={seller.shopName ?? ""}
              className="input"
              placeholder="เช่น ร้านป้าสมใจ ผักสด"
            />
          </div>

          <div>
            <label className="label">เบอร์ติดต่อร้าน *</label>
            <input
              name="contactPhone"
              type="tel"
              required
              defaultValue={seller.contactPhone ?? ""}
              className="input"
              placeholder="08xxxxxxxx"
            />
            <p className="mt-1 text-xs text-slate-400">ผู้ซื้อใช้ติดต่อคุณ · ทีมงานใช้ยืนยันตัวตน</p>
          </div>

          <div>
            <label className="label">LINE ID ของร้าน</label>
            <input
              name="lineId"
              maxLength={60}
              defaultValue={seller.lineId ?? ""}
              className="input"
              placeholder="@taladshop หรือ ไอดีไลน์ของคุณ"
            />
            <p className="mt-1 text-xs text-slate-400">
              ผู้ซื้อจะเห็น ID นี้ไว้ทักหาคุณ — ระบบดึงจาก LINE ให้อัตโนมัติไม่ได้
              (LINE ให้มาแค่รหัสภายในที่ค้นหาไม่ได้) กรอกเองจาก LINE &gt; ตั้งค่า &gt; โปรไฟล์
            </p>
          </div>

          <div>
            <label className="label">เกี่ยวกับร้าน</label>
            <textarea
              name="shopAbout"
              rows={2}
              maxLength={300}
              defaultValue={seller.shopAbout ?? ""}
              className="input"
              placeholder="เช่น ขายผักปลอดสารจากสวนตัวเอง เปิด 6 โมง–เที่ยง"
            />
          </div>

          {/* ---- ที่ตั้งร้าน: ตั้งครั้งเดียว ประกาศดึงไปใช้ ---- */}
          <div className="rounded-xl border border-brand/25 bg-brand-soft/50 p-4">
            <div className="text-sm font-semibold text-ink">📍 ที่ตั้งร้าน / จุดนัดรับ</div>
            <p className="mt-1 mb-3 text-xs text-slate-500">
              ตั้งที่นี่ครั้งเดียว — ตอนลงประกาศระบบจะเติมให้อัตโนมัติ ไม่ต้องเลือกใหม่ทุกครั้ง
              (ถ้าประกาศไหนอยู่คนละที่ ค่อยแก้เฉพาะประกาศนั้นได้)
            </p>
            <LocationPicker
              provinces={provinces}
              initial={
                shopGeo ? { ...shopGeo, marketName: seller.marketName ?? "" } : undefined
              }
              initialDistricts={shopDistricts}
              initialSubdistricts={shopSubdistricts}
            />
          </div>

          {/* ---- เอกสารยืนยันร้าน (ไม่บังคับ) ---- */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
            <div className="text-sm font-semibold text-ink">
              🛡️ ยืนยันร้านกับบริษัท <span className="font-normal text-slate-400">(ไม่บังคับ)</span>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              ยื่นเอกสารเพื่อรับสิทธิ์ใช้วิธีรับของแบบ <b>โอนเงินก่อน</b> และป้ายร้านยืนยัน —
              ทีมงานจะตรวจสอบก่อนอนุมัติ
            </p>

            <div className="mt-3 space-y-3">
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="label">ธนาคาร</label>
                  <select
                    name="bankName"
                    defaultValue={seller.bankName ?? ""}
                    className="input"
                  >
                    <option value="">เลือกธนาคาร</option>
                    {THAI_BANKS.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                    {/* ถ้าค่าที่เคยบันทึกไว้ไม่อยู่ในรายการ (ของเก่าที่พิมพ์เอง)
                        ยังเก็บไว้เป็นตัวเลือก จะได้ไม่หายตอนเปิดหน้า */}
                    {seller.bankName && !THAI_BANKS.includes(seller.bankName) && (
                      <option value={seller.bankName}>{seller.bankName}</option>
                    )}
                  </select>
                </div>
                <div className="flex-1">
                  <label className="label">เลขที่บัญชี</label>
                  <input
                    name="bankAccountNo"
                    defaultValue={seller.bankAccountNo ?? ""}
                    className="input"
                    placeholder="xxx-xxxxxx-x"
                  />
                </div>
              </div>

              <div>
                <label className="label">ชื่อบัญชี</label>
                <input
                  name="bankAccountName"
                  defaultValue={seller.bankAccountName ?? ""}
                  className="input"
                  placeholder="ชื่อเจ้าของบัญชี"
                />
              </div>

              <div>
                <label className="label">ชื่อบริษัท / ชื่อกิจการ</label>
                <input
                  name="companyName"
                  defaultValue={seller.companyName ?? ""}
                  className="input"
                  placeholder="ถ้าเป็นนิติบุคคล ใส่ชื่อตามทะเบียน"
                />
              </div>

              <div>
                <label className="label">หน้าสมุดบัญชี (รูป/PDF)</label>
                <DocUpload existing={seller.bookBankUrl} />
              </div>

              <label className="flex items-start gap-2 text-xs text-slate-600">
                <input
                  type="checkbox"
                  name="submitForVerify"
                  className="mt-0.5"
                  disabled={seller.verifyStatus === "approved"}
                />
                <span>
                  ส่งเอกสารให้บริษัทตรวจสอบและอนุมัติ
                  {seller.verifyStatus === "approved" && " (ร้านนี้อนุมัติแล้ว)"}
                </span>
              </label>
            </div>
          </div>

          <SubmitButton className="btn-primary w-full py-2.5" pendingText="กำลังบันทึก…">
            {isFirstTime ? "บันทึกและไปลงประกาศ" : "บันทึกข้อมูลร้าน"}
          </SubmitButton>
        </form>
      </div>
    </div>
  );
}
