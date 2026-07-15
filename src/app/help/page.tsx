import Link from "next/link";
import { COMPANY } from "@/lib/company";

export const metadata = {
  title: "ช่วยเหลือ & ติดต่อ",
  description: "วิธีใช้งาน คำแนะนำความปลอดภัย และช่องทางติดต่อตลาดออนไลน์",
};

export default function HelpPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/" className="text-sm text-slate-400 hover:text-slate-600">← กลับหน้าแรก</Link>
      <h1 className="mt-3 text-2xl font-bold">ช่วยเหลือ &amp; ติดต่อ</h1>

      {/* ความปลอดภัย */}
      <section className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5">
        <h2 className="font-bold text-amber-800">🛡️ ซื้อขายอย่างปลอดภัย</h2>
        <ul className="mt-2 space-y-1.5 text-sm text-amber-800">
          <li>• <b>ห้ามโอนเงินมัดจำ/ค่าสินค้าล่วงหน้า</b> ให้คนไม่รู้จัก</li>
          <li>• เลือก <b>นัดรับเจอตัว</b> หรือ <b>เก็บเงินปลายทาง (COD)</b> — จ่ายตอนได้รับของ</li>
          <li>• อยู่คนละจังหวัด? แนะนำ COD ให้ขนส่งเก็บเงินแทน อย่าโอนก่อน</li>
          <li>• ตรวจสินค้าให้เรียบร้อยก่อนจ่ายเงิน</li>
          <li>• เจอประกาศน่าสงสัย/หลอกลวง กด <b>&ldquo;รายงานประกาศ&rdquo;</b> ในหน้าสินค้า</li>
        </ul>
      </section>

      {/* วิธีใช้งาน */}
      <section className="mt-5">
        <h2 className="section-title">วิธีใช้งาน</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div className="card p-4">
            <div className="font-semibold text-ink">👤 ผู้ซื้อ</div>
            <p className="mt-1 text-sm text-slate-500">
              ค้นหาสินค้า → กด &ldquo;ติดต่อ&rdquo; → นัดรับ/COD จ่ายตอนได้ของ ไม่ต้องสมัครก็ดูได้
            </p>
          </div>
          <div className="card p-4">
            <div className="font-semibold text-ink">🏪 ผู้ขาย</div>
            <p className="mt-1 text-sm text-slate-500">
              เข้าสู่ระบบ → ลงประกาศ (รูป/ราคา/วิธีรับของ) → ทดลองฟรี 30 วัน แล้วต่ออายุสมาชิก
            </p>
            <Link href="/login" className="mt-2 inline-block text-sm text-brand underline">
              เริ่มลงขาย →
            </Link>
          </div>
        </div>
      </section>

      {/* ติดต่อ */}
      <section className="mt-5">
        <h2 className="section-title">ติดต่อเรา</h2>
        <div className="mt-3 card p-5 text-sm">
          <div className="font-semibold text-ink">{COMPANY.nameTh}</div>
          <div className="mt-1 space-y-0.5 text-slate-500">
            <div>{COMPANY.address}</div>
            <div>
              โทร:{" "}
              {COMPANY.phones.map((p, i) => (
                <span key={p}>
                  {i > 0 && " , "}
                  <a href={`tel:${p}`} className="text-brand underline">{p}</a>
                </span>
              ))}
            </div>
            <div>เลขทะเบียน {COMPANY.regNo}</div>
          </div>
          <p className="mt-3 text-xs text-slate-400">
            มีปัญหาการใช้งาน / ร้องเรียน / ถูกโกงจากการนัดเจอ — โทรหาเราได้ตามเบอร์ด้านบน
          </p>
        </div>
      </section>

      <p className="mt-6 text-center text-xs text-slate-400">
        ดูเพิ่ม: <Link href="/terms" className="underline">ข้อตกลง</Link> ·{" "}
        <Link href="/privacy" className="underline">ความเป็นส่วนตัว</Link>
      </p>
    </div>
  );
}
