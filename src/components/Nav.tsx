import Link from "next/link";
import { getCurrentSeller } from "@/lib/auth";
import { daysLeft } from "@/lib/format";

export default async function Nav() {
  const seller = await getCurrentSeller();
  const dleft = seller ? daysLeft(seller.membershipExpiresAt) : null;

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/60 glass">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
        <Link href="/" className="flex items-center gap-2 text-lg font-extrabold tracking-tight text-brand-dark">
          <span className="grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-br from-brand to-brand-dark text-white shadow-soft">
            🧺
          </span>
          <span>ตลาดออนไลน์</span>
        </Link>

        <nav className="ml-auto flex items-center gap-1 text-sm">
          <Link href="/" className="hidden rounded-full px-3 py-2 text-slate-600 hover:bg-white/70 sm:block">
            หน้าแรก
          </Link>
          {seller ? (
            <>
              {dleft !== null && (
                <span
                  className={`chip ${
                    dleft <= 3
                      ? "border-red-200 bg-red-50 text-red-600"
                      : "border-brand/25 bg-brand-soft text-brand-dark"
                  }`}
                  title="วันสมาชิกคงเหลือ"
                >
                  {dleft > 0 ? `เหลือ ${dleft} วัน` : "หมดอายุ"}
                </span>
              )}
              <Link href="/sell" className="btn-outline">ร้านของฉัน</Link>
            </>
          ) : (
            <Link href="/login" className="btn-primary">
              <span>ลงขายกับเรา</span>
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
