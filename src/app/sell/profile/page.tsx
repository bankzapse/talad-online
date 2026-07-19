import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentSeller } from "@/lib/auth";
import { saveShopProfileAction } from "@/app/actions";
import SubmitButton from "@/components/SubmitButton";
import { safeNext } from "@/lib/url";

export const dynamic = "force-dynamic";

const ERR: Record<string, string> = {
  name: "กรุณากรอกชื่อร้าน (อย่างน้อย 2 ตัวอักษร)",
  db: "บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง",
};

export default async function ShopProfile({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const seller = await getCurrentSeller();
  if (!seller) redirect("/login");
  const sp = await searchParams;
  const next = safeNext(sp.next, "/sell");
  const isFirstTime = !seller.shopName;

  return (
    <div className="mx-auto max-w-lg">
      <Link href="/sell" className="text-sm text-slate-400 hover:text-slate-600">
        ← กลับร้านของฉัน
      </Link>

      <div className="mt-4 card p-6">
        <h1 className="text-lg font-bold">ข้อมูลร้านค้า</h1>
        <p className="mt-1 text-sm text-slate-500">
          {isFirstTime
            ? "กรอกชื่อร้านให้เรียบร้อยก่อน จึงจะลงประกาศได้"
            : "แก้ไขข้อมูลร้านของคุณ"}
        </p>

        {isFirstTime && next.includes("/sell/new") && (
          <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
            📌 ต้องตั้งชื่อร้านก่อนลงประกาศ — ผู้ซื้อจะเห็นชื่อนี้ในทุกประกาศของคุณ
          </div>
        )}

        {sp.error && (
          <div className="mt-3 rounded-lg bg-red-50 p-2 text-center text-xs text-red-600">
            {ERR[sp.error] ?? "เกิดข้อผิดพลาด"}
          </div>
        )}

        <form action={saveShopProfileAction} className="mt-5 space-y-3">
          <input type="hidden" name="next" value={next} />
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
            <p className="mt-1 text-xs text-slate-400">
              ชื่อที่ผู้ซื้อเห็นบนประกาศ — ใส่ชื่อที่จำง่ายและตรงกับของที่ขาย
            </p>
          </div>

          <div>
            <label className="label">เกี่ยวกับร้าน (ไม่บังคับ)</label>
            <textarea
              name="shopAbout"
              rows={3}
              maxLength={300}
              defaultValue={seller.shopAbout ?? ""}
              className="input"
              placeholder="เช่น ขายผักปลอดสารจากสวนตัวเอง ส่งทุกเช้า เปิด 6 โมง–เที่ยง"
            />
          </div>

          <SubmitButton className="btn-primary w-full py-2.5" pendingText="กำลังบันทึก…">
            {isFirstTime ? "บันทึกและไปลงประกาศ" : "บันทึก"}
          </SubmitButton>
        </form>
      </div>
    </div>
  );
}
