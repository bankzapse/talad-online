import Link from "next/link";

export const metadata = {
  title: "โปรแกรมพาร์ทเนอร์ผู้ขาย (เร็ว ๆ นี้)",
  description:
    "อนาคตของตลาดออนไลน์ — ขายออนไลน์ รับเงินผ่านระบบ หักค่าคอมอัตโนมัติ โอนเข้าบัญชีเป็นรอบ",
  robots: { index: false, follow: false },
};

// -----------------------------------------------------------------------------
// PATH แยกสำหรับโมเดล "marketplace + payout" (Phase 2) — เผื่อขยายบริษัทในอนาคต
// แยกออกจาก /sell (membership) โดยสิ้นเชิง เพื่อไม่ให้ปนกับ MVP ปัจจุบัน
// รายละเอียดออกแบบ: docs/PHASE2-marketplace-payout.md
// -----------------------------------------------------------------------------
export default function SellerPartner() {
  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/" className="text-sm text-slate-400 hover:text-slate-600">← กลับหน้าแรก</Link>

      <div className="mt-4 overflow-hidden rounded-3xl bg-gradient-to-r from-brand-dark to-brand-darker p-8 text-white shadow-lift sm:p-12">
        <span className="chip border-white/25 bg-white/15 text-white">🚀 เร็ว ๆ นี้ · Phase 2</span>
        <h1 className="mt-4 text-3xl font-extrabold">โปรแกรมพาร์ทเนอร์ผู้ขาย</h1>
        <p className="mt-3 max-w-lg text-sm text-white/85">
          ก้าวต่อไปของตลาดออนไลน์ — ขายออนไลน์เต็มรูปแบบ ผู้ซื้อจ่ายผ่านระบบ
          เราหักค่าคอมอัตโนมัติแล้วโอนเข้าบัญชีคุณเป็นรอบ พร้อมสรุปยอด–ใบเสร็จครบ
        </p>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <Feature emoji="💳" title="รับเงินออนไลน์" desc="ผู้ซื้อจ่ายผ่านบัตร/พร้อมเพย์ ปลอดภัย ไม่ต้องโอนหากัน" />
        <Feature emoji="🧮" title="หักค่าคอมอัตโนมัติ" desc="ระบบคิดค่าคอมต่อออเดอร์ให้ ไม่ต้องคำนวณเอง" />
        <Feature emoji="🏦" title="โอนเข้าบัญชีเป็นรอบ" desc="เคลียร์ยอดตามรอบบิล เข้าบัญชี/พร้อมเพย์ของคุณ" />
        <Feature emoji="📊" title="สรุปยอด + ใบเสร็จ" desc="ดูรายรับ ค่าคอม ยอดสุทธิ ประวัติการโอนย้อนหลัง" />
      </div>

      <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
        ⚠️ ฟีเจอร์นี้อยู่ระหว่างพัฒนา (ต้องเชื่อมผู้ให้บริการชำระเงินที่มีใบอนุญาต + ระบบบัญชี ledger)
        — ปัจจุบันตลาดออนไลน์ให้บริการแบบ <b>ประกาศ + นัดเจอจ่ายสด</b> โดยไม่แตะเงินซื้อขาย
      </div>

      <div className="mt-6 text-center">
        <Link href="/login" className="btn-primary">ตอนนี้เริ่มลงขายแบบสมาชิกได้เลย →</Link>
      </div>
    </div>
  );
}

function Feature({ emoji, title, desc }: { emoji: string; title: string; desc: string }) {
  return (
    <div className="card p-4">
      <div className="text-2xl">{emoji}</div>
      <h3 className="mt-2 font-bold text-ink">{title}</h3>
      <p className="mt-1 text-sm text-slate-500">{desc}</p>
    </div>
  );
}
