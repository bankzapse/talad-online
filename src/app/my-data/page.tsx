import Link from "next/link";
import { getCurrentSeller, getBuyerKey } from "@/lib/auth";
import { getSellerListings, getSellerOrders, getBuyerOrders, getSellerPayments } from "@/lib/data";
import { eraseMyDataAction } from "@/app/actions";
import SubmitButton from "@/components/SubmitButton";
import { COMPANY } from "@/lib/company";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "ข้อมูลส่วนบุคคลของฉัน — ตลาดออนไลน์",
  description: "ขอดู ดาวน์โหลด แก้ไข หรือลบข้อมูลส่วนบุคคลของคุณตาม PDPA",
};

export default async function MyData({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; count?: string }>;
}) {
  const sp = await searchParams;
  const seller = await getCurrentSeller();
  const buyerKey = await getBuyerKey();

  const [listings, sellerOrders, payments, buyerOrders] = await Promise.all([
    seller ? getSellerListings(seller.id) : Promise.resolve([]),
    seller ? getSellerOrders(seller.id) : Promise.resolve([]),
    seller ? getSellerPayments(seller.id) : Promise.resolve([]),
    buyerKey ? getBuyerOrders(buyerKey) : Promise.resolve([]),
  ]);

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-xl font-bold">ข้อมูลส่วนบุคคลของฉัน</h1>
      <p className="mt-1 text-sm text-slate-500">
        ตาม พ.ร.บ.คุ้มครองข้อมูลส่วนบุคคล (PDPA) ท่านมีสิทธิ์ขอดู ขอสำเนา ขอแก้ไข และขอลบ
        ข้อมูลส่วนบุคคลของท่านได้ด้วยตัวเองจากหน้านี้
      </p>

      {sp.error === "confirm" && (
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
          ต้องพิมพ์คำว่า <b>ลบบัญชี</b> ให้ตรงก่อน จึงจะลบข้อมูลได้
        </div>
      )}
      {sp.error === "open" && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">
          ลบไม่ได้ — ยังมีคำสั่งซื้อค้างอยู่ {sp.count} รายการ
          <br />
          ต้องให้รายการเหล่านั้นเสร็จสิ้นหรือยกเลิกก่อน เพราะอีกฝ่ายยังต้องใช้ข้อมูลในการส่งของ
        </div>
      )}

      {!seller && !buyerKey && (
        <div className="mt-6 card p-8 text-center">
          <p className="text-slate-500">กรุณาเข้าสู่ระบบก่อน เพื่อดูข้อมูลของบัญชีท่าน</p>
          <div className="mt-4 flex justify-center gap-2">
            <Link href="/login?next=/my-data" className="btn-primary">
              เข้าสู่ระบบผู้ขาย
            </Link>
            <Link href="/login?buyer=1&next=/my-data" className="btn-outline">
              เข้าสู่ระบบผู้ซื้อ
            </Link>
          </div>
        </div>
      )}

      {/* ---------------- ผู้ขาย ---------------- */}
      {seller && (
        <section className="mt-6 card p-5">
          <h2 className="font-bold text-ink">🏪 บัญชีผู้ขาย</h2>

          <dl className="mt-3 space-y-1.5 text-sm">
            <Row label="ชื่อร้าน" value={seller.shopName ?? "—"} />
            <Row label="ชื่อที่แสดง" value={seller.displayName} />
            <Row label="เบอร์ติดต่อ" value={seller.contactPhone ?? "—"} />
            <Row label="LINE ID" value={seller.lineId ?? "—"} />
            <Row
              label="บัญชีธนาคาร"
              value={
                seller.bankAccountNo
                  ? `${seller.bankName ?? ""} ${seller.bankAccountNo}`.trim()
                  : "—"
              }
            />
            <Row
              label="หน้าสมุดบัญชี"
              value={seller.bookBankUrl ? "แนบไว้ (เห็นได้เฉพาะทีมงานตรวจสอบ)" : "—"}
            />
            <Row label="ประกาศ" value={`${listings.length} รายการ`} />
            <Row label="คำสั่งซื้อที่ได้รับ" value={`${sellerOrders.length} รายการ`} />
            <Row label="ประวัติการชำระเงิน" value={`${payments.length} รายการ`} />
          </dl>

          <div className="mt-4 flex flex-wrap gap-2">
            <a href="/api/my-data" className="btn-primary text-sm">
              ⬇ ดาวน์โหลดข้อมูลทั้งหมด (JSON)
            </a>
            <Link href="/sell/profile" className="btn-outline text-sm">
              ✏️ แก้ไขข้อมูลร้าน
            </Link>
          </div>

          <EraseBox role="seller" />
        </section>
      )}

      {/* ---------------- ผู้ซื้อ ---------------- */}
      {buyerKey && (
        <section className="mt-4 card p-5">
          <h2 className="font-bold text-ink">👤 บัญชีผู้ซื้อ</h2>
          <p className="mt-1 text-sm text-slate-500">
            ระบบไม่ได้เก็บโปรไฟล์ผู้ซื้อแยกต่างหาก — ชื่อ เบอร์ และที่อยู่จัดส่ง
            ถูกเก็บไว้กับแต่ละคำสั่งซื้อเท่านั้น
          </p>

          <dl className="mt-3 space-y-1.5 text-sm">
            <Row label="คำสั่งซื้อ" value={`${buyerOrders.length} รายการ`} />
            <Row label="ชื่อผู้รับล่าสุด" value={buyerOrders[0]?.buyerName ?? "—"} />
            <Row label="เบอร์ล่าสุด" value={buyerOrders[0]?.buyerPhone ?? "—"} />
            <Row label="ที่อยู่จัดส่งล่าสุด" value={buyerOrders[0]?.address ?? "—"} />
          </dl>

          <div className="mt-4 flex flex-wrap gap-2">
            <a href="/api/my-data?role=buyer" className="btn-primary text-sm">
              ⬇ ดาวน์โหลดข้อมูลทั้งหมด (JSON)
            </a>
            <Link href="/orders" className="btn-outline text-sm">
              📦 ดูคำสั่งซื้อ
            </Link>
          </div>
          <p className="mt-2 text-xs text-slate-400">
            แก้ชื่อ/เบอร์/ที่อยู่: กรอกค่าใหม่ตอนสั่งซื้อครั้งถัดไป ระบบจะใช้ค่าล่าสุดเสมอ
          </p>

          <EraseBox role="buyer" />
        </section>
      )}

      <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-500">
        <div className="font-medium text-slate-600">ผู้ควบคุมข้อมูลส่วนบุคคล</div>
        <div className="mt-1">
          {COMPANY.nameTh} ({COMPANY.nameEn})
          <br />
          เลขทะเบียน {COMPANY.regNo}
          <br />
          {COMPANY.address}
          <br />
          โทร {COMPANY.phones.join(" , ")}
        </div>
        <p className="mt-2">
          หากต้องการใช้สิทธิ์อื่น เช่น ขอระงับการใช้ข้อมูล หรือคัดค้านการประมวลผล
          กรุณาติดต่อตามช่องทางข้างต้น · อ่าน{" "}
          <Link href="/privacy" className="underline">
            นโยบายความเป็นส่วนตัว
          </Link>
        </p>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 border-b border-slate-100 pb-1.5">
      <dt className="shrink-0 text-slate-500">{label}</dt>
      <dd className="text-right text-slate-700">{value}</dd>
    </div>
  );
}

function EraseBox({ role }: { role: "seller" | "buyer" }) {
  const action = eraseMyDataAction.bind(null, role);
  return (
    <details className="mt-4 rounded-lg border border-red-100 bg-red-50/40 p-3">
      <summary className="cursor-pointer text-sm font-medium text-red-600">
        🗑️ ขอลบข้อมูลส่วนบุคคลของฉัน
      </summary>

      <div className="mt-3 space-y-2 text-xs text-slate-600">
        <p>
          <b>สิ่งที่จะถูกลบทันที:</b>{" "}
          {role === "seller"
            ? "ชื่อร้าน เบอร์ติดต่อ LINE ID เลขบัญชีธนาคาร รูปหน้าสมุดบัญชี และประกาศทั้งหมดของท่าน"
            : "ชื่อผู้รับ เบอร์ติดต่อ ที่อยู่จัดส่ง และข้อความถึงร้าน ในทุกคำสั่งซื้อของท่าน"}
        </p>
        <p>
          <b>สิ่งที่ยังเก็บไว้:</b> ตัวเลขรายการซื้อขาย (ราคา จำนวน วันที่)
          โดยไม่มีข้อมูลที่ระบุตัวท่านได้ — เก็บเป็นเอกสารทางบัญชีตามที่กฎหมายภาษีกำหนด
        </p>
        <p className="text-red-600">
          ลบแล้วกู้คืนไม่ได้ และบัญชีนี้จะเข้าใช้งานต่อไม่ได้
        </p>
        {role === "seller" && (
          <p>หมายเหตุ: ลบไม่ได้ถ้ายังมีคำสั่งซื้อค้างอยู่ — ต้องปิดรายการให้เรียบร้อยก่อน</p>
        )}
      </div>

      <form action={action} className="mt-3 flex flex-wrap gap-2">
        <input
          name="confirm"
          required
          placeholder="พิมพ์ว่า ลบบัญชี"
          className="input flex-1 py-1.5 text-sm"
        />
        <SubmitButton
          className="btn border border-red-300 px-4 py-1.5 text-sm text-red-600 hover:bg-red-100"
          pendingText="กำลังลบ…"
        >
          ยืนยันลบข้อมูล
        </SubmitButton>
      </form>
    </details>
  );
}
