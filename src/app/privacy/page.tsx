import Link from "next/link";
import { COMPANY } from "@/lib/company";

export const metadata = { title: "นโยบายความเป็นส่วนตัว (PDPA) — ตลาดออนไลน์" };

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/" className="text-sm text-slate-400 hover:text-slate-600">← กลับหน้าแรก</Link>
      <h1 className="mt-3 text-2xl font-bold">นโยบายความเป็นส่วนตัว (PDPA)</h1>
      <p className="mt-1 text-xs text-amber-600">
        ⚠️ เอกสารนี้เป็นแบบร่างตั้งต้น ควรให้ทนาย/ผู้เชี่ยวชาญ PDPA ตรวจสอบก่อนเปิดใช้งานจริง
      </p>

      <div className="mt-6 space-y-5 text-sm leading-relaxed text-slate-700">
        <section>
          <h2 className="font-bold text-slate-800">1. ข้อมูลที่เราเก็บ</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>ข้อมูลจาก LINE Login: LINE User ID และชื่อที่แสดง (display name)</li>
            <li>เบอร์โทรศัพท์ (สำหรับยืนยันตัวตนผู้ขายด้วย OTP)</li>
            <li>ข้อมูลประกาศที่ลง: รูป ราคา หมวด พื้นที่/ตลาด รายละเอียดสินค้า</li>
            <li>หลักฐานการชำระเงิน (สลิป) สำหรับสมาชิกผู้ขาย</li>
            <li>ข้อมูลการใช้งานทางเทคนิค (log, การกดปุ่มติดต่อ) เพื่อความปลอดภัยและป้องกันสแปม</li>
          </ul>
        </section>

        <section>
          <h2 className="font-bold text-slate-800">2. วัตถุประสงค์การใช้ข้อมูล</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>ให้บริการกระดานประกาศและเชื่อมต่อผู้ซื้อ–ผู้ขาย (แจ้งเตือนผ่าน LINE)</li>
            <li>ยืนยันตัวตน ป้องกันบัญชีปลอมและการสแปม</li>
            <li>จัดการสมาชิกและการชำระค่าบริการ</li>
            <li>ปรับปรุงบริการและดูแลความปลอดภัยของระบบ</li>
          </ul>
        </section>

        <section>
          <h2 className="font-bold text-slate-800">3. การขอความยินยอม</h2>
          <p>
            เมื่อสมัครและใช้งาน ถือว่าท่านยินยอมให้เก็บและใช้ข้อมูลตามนโยบายนี้ ท่านสามารถถอนความยินยอมได้
            โดยการปิดบัญชี (ซึ่งอาจทำให้ไม่สามารถใช้บริการต่อได้)
          </p>
        </section>

        <section>
          <h2 className="font-bold text-slate-800">4. การเปิดเผยข้อมูล</h2>
          <p>
            เราไม่ขายข้อมูลส่วนบุคคลของท่าน ข้อมูลบางส่วนที่จำเป็น (เช่น ชื่อร้าน/ช่องทางติดต่อในประกาศ)
            จะแสดงต่อผู้ซื้อเพื่อการติดต่อซื้อขาย เราอาจใช้ผู้ให้บริการภายนอก (เช่น LINE, ผู้ให้บริการฐานข้อมูล/
            ตรวจสลิป/OTP) เพื่อประมวลผลข้อมูลตามวัตถุประสงค์ข้างต้น
          </p>
        </section>

        <section>
          <h2 className="font-bold text-slate-800">5. ระยะเวลาเก็บรักษา</h2>
          <p>เราเก็บข้อมูลเท่าที่จำเป็นต่อการให้บริการและตามที่กฎหมายกำหนด และจะลบ/ทำให้ไม่ระบุตัวตนเมื่อหมดความจำเป็น</p>
        </section>

        <section>
          <h2 className="font-bold text-slate-800">6. สิทธิของเจ้าของข้อมูล</h2>
          <p>
            ท่านมีสิทธิ์เข้าถึง ขอแก้ไข ขอลบ ขอระงับการใช้ หรือคัดค้านการประมวลผลข้อมูลส่วนบุคคลของท่าน
            ตามพระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล (PDPA)
          </p>
          <p className="mt-2 rounded-lg border border-brand/30 bg-brand-light p-3">
            <b>ใช้สิทธิ์ได้ทันทีด้วยตัวเอง</b> — เข้าสู่ระบบแล้วไปที่หน้า{" "}
            <Link href="/my-data" className="font-medium underline">
              ข้อมูลส่วนบุคคลของฉัน
            </Link>{" "}
            เพื่อดูข้อมูลทั้งหมดที่เราเก็บ ดาวน์โหลดสำเนา แก้ไข หรือลบข้อมูลของท่าน
            <br />
            สิทธิ์อื่น เช่น ขอระงับการใช้ข้อมูล กรุณาติดต่อตามช่องทางในข้อ 7
          </p>
        </section>

        <section>
          <h2 className="font-bold text-slate-800">7. ผู้ควบคุมข้อมูล / การติดต่อ</h2>
          <div className="rounded-lg bg-slate-50 p-3 text-sm">
            <div className="font-medium text-slate-700">{COMPANY.nameTh}</div>
            <div className="text-slate-500">{COMPANY.nameEn}</div>
            <div className="text-slate-500">เลขทะเบียน {COMPANY.regNo}</div>
            <div className="text-slate-500">{COMPANY.address}</div>
            <div className="text-slate-500">โทร {COMPANY.phones.join(" , ")}</div>
          </div>
        </section>

        <p className="text-xs text-slate-400">
          ดูเพิ่มเติม: <Link href="/terms" className="underline">ข้อตกลงการใช้งาน</Link>
        </p>
      </div>
    </div>
  );
}
