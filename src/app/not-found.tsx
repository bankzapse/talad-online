import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <div className="text-5xl">🔍</div>
      <h1 className="mt-4 text-xl font-bold text-ink">ไม่พบหน้าที่ต้องการ</h1>
      <p className="mt-2 text-sm text-slate-500">
        หน้านี้อาจถูกลบ ปิดการขาย หรือผู้ขายสมาชิกหมดอายุ
      </p>
      <div className="mt-6 flex justify-center gap-2">
        <Link href="/" className="btn-primary">กลับหน้าแรก</Link>
        <Link href="/help" className="btn-outline">ช่วยเหลือ</Link>
      </div>
    </div>
  );
}
