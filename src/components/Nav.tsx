import Link from "next/link";
import { getCurrentSeller } from "@/lib/auth";
import { daysLeft } from "@/lib/format";

export default async function Nav() {
  const seller = await getCurrentSeller();
  const dleft = seller ? daysLeft(seller.membershipExpiresAt) : null;

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3">
        <Link href="/" className="flex items-center gap-2 font-bold text-brand-dark">
          <span className="text-xl">🧺</span>
          <span>ตลาดออนไลน์</span>
        </Link>
        <nav className="ml-auto flex items-center gap-1 text-sm">
          <Link href="/" className="rounded-lg px-3 py-1.5 text-slate-600 hover:bg-slate-100">
            หน้าแรก
          </Link>
          {seller ? (
            <>
              <Link href="/sell" className="rounded-lg px-3 py-1.5 text-slate-600 hover:bg-slate-100">
                ร้านของฉัน
              </Link>
              {dleft !== null && (
                <span
                  className={`chip ${
                    dleft <= 3
                      ? "border-red-200 bg-red-50 text-red-600"
                      : "border-brand/30 bg-brand-light text-brand-dark"
                  }`}
                  title="วันสมาชิกคงเหลือ"
                >
                  {dleft > 0 ? `เหลือ ${dleft} วัน` : "หมดอายุแล้ว"}
                </span>
              )}
            </>
          ) : (
            <Link href="/login" className="btn-primary">
              ผู้ขาย เข้าสู่ระบบ
            </Link>
          )}
          <Link href="/admin" className="rounded-lg px-3 py-1.5 text-slate-400 hover:bg-slate-100">
            admin
          </Link>
        </nav>
      </div>
    </header>
  );
}
