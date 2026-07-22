import Link from "next/link";
import Logo from "./Logo";
import BottomNav from "./BottomNav";
import { getCurrentSeller, isBuyerLoggedIn } from "@/lib/auth";
import { countPendingOrders } from "@/lib/data";
import { daysLeft } from "@/lib/format";
import { logout, logoutBuyer } from "@/app/actions";

export default async function Nav() {
  const seller = await getCurrentSeller();
  const buyerIn = await isBuyerLoggedIn();
  const dleft = seller ? daysLeft(seller.membershipExpiresAt) : null;
  // เลขบนไอคอน "คำสั่งซื้อ" ในแถบล่าง — ร้านต้องเห็นว่ามีออร์เดอร์ค้างจากทุกหน้า
  const pending = seller ? await countPendingOrders(seller.id) : 0;

  return (
    <>
    <header className="sticky top-0 z-30 border-b border-slate-200/60 glass">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
        <Link href="/" className="flex shrink-0 items-center gap-2.5 text-brand-dark">
          <Logo size={36} />
          <span className="flex flex-col whitespace-nowrap leading-none">
            <span className="text-lg font-extrabold tracking-tight">Talad</span>
            <span className="mt-0.5 text-[11px] font-medium text-slate-500">ตลาดออนไลน์</span>
          </span>
        </Link>

        <nav className="ml-auto flex items-center gap-1 text-sm">
          <Link href="/" className="hidden rounded-full px-3 py-2 text-slate-600 hover:bg-white/70 sm:block">
            หน้าแรก
          </Link>
          <Link href="/help" className="hidden rounded-full px-3 py-2 text-slate-600 hover:bg-white/70 sm:block">
            ช่วยเหลือ
          </Link>
          {/* ลิงก์คำสั่งซื้อ — แสดงทุกครั้งที่ล็อกอินเป็นผู้ซื้อ แม้จะเป็นผู้ขายอยู่ด้วย
              (ร้านค้าซื้อของร้านอื่นได้ ใช้คนละ cookie กัน) */}
          {/* บนมือถือซ่อน — แถบเมนูล่างมีปุ่มคำสั่งซื้ออยู่แล้ว ไม่ต้องมีสองที่ */}
          {buyerIn && (
            <Link
              href="/orders"
              className="hidden rounded-full px-3 py-2 text-slate-600 hover:bg-white/70 sm:block"
            >
              📦 คำสั่งซื้อ
            </Link>
          )}

          {/* บนมือถือเหลือแค่ปุ่มเดียว — วันสมาชิกกับปุ่มออกจากระบบมีอยู่แล้วในหน้า /sell
              เอามาไว้บนแถบนี้ด้วยทำให้เบียดจนตัวหนังสือตัดกลางคำ */}
          {seller ? (
            <>
              {dleft !== null && (
                <span
                  className={`chip hidden sm:inline-flex ${
                    dleft <= 3
                      ? "border-red-200 bg-red-50 text-red-600"
                      : "border-brand/25 bg-brand-soft text-brand-dark"
                  }`}
                  title="วันสมาชิกคงเหลือ"
                >
                  {dleft > 0 ? `เหลือ ${dleft} วัน` : "หมดอายุ"}
                </span>
              )}
              <Link href="/sell" className="btn-outline px-3 py-2 sm:px-5 sm:py-2.5">
                ร้านของฉัน
              </Link>
              <form action={logout} className="hidden sm:block">
                <button className="rounded-full px-3 py-2 text-slate-500 hover:bg-white/70 hover:text-slate-700">
                  ออกจากระบบ
                </button>
              </form>
            </>
          ) : buyerIn ? (
            <>
              {/* ผู้ซื้อไม่มีหน้า "ร้านของฉัน" ให้ออกจากระบบ → ปุ่มนี้ต้องอยู่บนมือถือด้วย
                  ตัด "ลงขายกับเรา" ออกแทน (ยังเข้าได้จาก footer และหน้า /login) */}
              <Link href="/login" className="btn-outline hidden sm:inline-flex">
                ลงขายกับเรา
              </Link>
              <form action={logoutBuyer}>
                <button className="rounded-full px-3 py-2 text-slate-500 hover:bg-white/70 hover:text-slate-700">
                  ออกจากระบบ
                </button>
              </form>
            </>
          ) : (
            <Link href="/login" className="btn-primary">
              <span>ลงขายกับเรา</span>
            </Link>
          )}
        </nav>
      </div>
    </header>

    {/* แถบล่างเฉพาะคนที่ล็อกอินแล้ว — คนที่แค่เข้ามาดูของ ไม่ต้องมีอะไรมาบังจอ
        ผู้ขายมาก่อน: ถ้าล็อกอินทั้งสองบทบาท เมนูร้านสำคัญกว่า (มีออร์เดอร์ค้างต้องรีบทำ) */}
    {seller ? (
      <BottomNav role="seller" pendingOrders={pending} />
    ) : buyerIn ? (
      <BottomNav role="buyer" />
    ) : null}
    </>
  );
}
