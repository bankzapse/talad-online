"use client";

import Link from "next/link";
import Logo from "@/components/Logo";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <div className="flex justify-center"><Logo size={56} /></div>
      <h1 className="mt-4 text-xl font-bold text-ink">เกิดข้อผิดพลาดชั่วคราว</h1>
      <p className="mt-2 text-sm text-slate-500">
        ระบบมีปัญหาเล็กน้อย ลองใหม่อีกครั้ง หรือกลับหน้าแรก
      </p>
      <div className="mt-6 flex justify-center gap-2">
        <button onClick={reset} className="btn-primary">ลองใหม่</button>
        <Link href="/" className="btn-outline">กลับหน้าแรก</Link>
      </div>
    </div>
  );
}
