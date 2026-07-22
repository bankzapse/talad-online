"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// -----------------------------------------------------------------------------
// แถบเมนูล่างจอ — สำหรับมือถือเท่านั้น (จอใหญ่ใช้แถบบนพอ)
//
// ไม่เกี่ยวกับ LIFF เลย เป็น HTML+CSS ธรรมดา ใช้ได้ทั้งในแอป LINE และนอกแอป
// เหตุผลที่ต้องมี: หน้าร้านมีเมนูย่อยเยอะ (ลงประกาศ/คำสั่งซื้อ/สมาชิก/ข้อมูลร้าน)
// เข้าหน้าลึก ๆ แล้วต้องกดย้อนกลับหลายชั้นกว่าจะสลับเมนูได้
// -----------------------------------------------------------------------------

type Item = {
  href: string;
  label: string;
  icon: React.ReactNode;
  badge?: number;
  /** ถือว่า active เมื่อ pathname ขึ้นต้นด้วย prefix นี้ (ไม่ใส่ = ต้องตรงเป๊ะ) */
  match?: string;
};

const S = { fill: "none", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round", strokeLinejoin: "round" } as const;

const IconHome = (
  <svg viewBox="0 0 24 24" {...S}><path d="M3 10.5 12 3l9 7.5" /><path d="M5.5 9.5V20h13V9.5" /><path d="M9.5 20v-5.5h5V20" /></svg>
);
const IconPlus = (
  <svg viewBox="0 0 24 24" {...S}><rect x="3.5" y="3.5" width="17" height="17" rx="5" /><path d="M12 8.5v7M8.5 12h7" /></svg>
);
const IconBox = (
  <svg viewBox="0 0 24 24" {...S}><path d="M3.5 7.5 12 3.5l8.5 4v9L12 20.5l-8.5-4z" /><path d="M3.5 7.5 12 11.5l8.5-4M12 11.5v9" /></svg>
);
const IconShop = (
  <svg viewBox="0 0 24 24" {...S}><path d="M4 4h16l1 5a3 3 0 0 1-6 0 3 3 0 0 1-6 0 3 3 0 0 1-6 0z" /><path d="M5 11v9h14v-9" /></svg>
);
const IconUser = (
  <svg viewBox="0 0 24 24" {...S}><circle cx="12" cy="8" r="3.5" /><path d="M4.5 20.5a7.5 7.5 0 0 1 15 0" /></svg>
);
const IconSearch = (
  <svg viewBox="0 0 24 24" {...S}><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4.5 4.5" /></svg>
);

export default function BottomNav({
  isSeller,
  isBuyer,
  pendingOrders = 0,
}: {
  isSeller: boolean;
  isBuyer: boolean;
  pendingOrders?: number;
}) {
  const pathname = usePathname();

  // เมนูตามหน้าที่อยู่ ไม่ใช่ตามบทบาทที่ล็อกอิน
  //
  // ร้านค้าซื้อของร้านอื่นได้ (cookie คนละใบ) เลยเป็นทั้งผู้ขายและผู้ซื้อพร้อมกันได้
  // เดิมยึดผู้ขายไว้ก่อนเสมอ → กำลังกรอกคำสั่งซื้ออยู่แท้ ๆ แต่ข้างล่างเป็น
  // ลงประกาศ/ข้อมูลร้าน กดแล้วหลุดออกจากงานที่ทำค้างอยู่
  const inShop = pathname.startsWith("/sell");
  const role: "seller" | "buyer" = inShop
    ? isSeller
      ? "seller"
      : "buyer"
    : isBuyer
    ? "buyer"
    : "seller";

  const items: Item[] =
    role === "seller"
      ? [
          { href: "/sell", label: "ร้านของฉัน", icon: IconShop },
          { href: "/sell/new", label: "ลงประกาศ", icon: IconPlus },
          { href: "/sell/orders", label: "คำสั่งซื้อ", icon: IconBox, badge: pendingOrders },
          { href: "/sell/profile", label: "ข้อมูลร้าน", icon: IconUser },
        ]
      : [
          { href: "/", label: "หน้าแรก", icon: IconHome },
          { href: "/?sort=new#listings", label: "ค้นหา", icon: IconSearch },
          { href: "/orders", label: "คำสั่งซื้อ", icon: IconBox, match: "/orders" },
          // เป็นผู้ขายด้วย → ปุ่มสุดท้ายพากลับร้าน จะได้สลับโหมดได้จากแถบล่างเลย
          isSeller
            ? { href: "/sell", label: "ร้านของฉัน", icon: IconShop, badge: pendingOrders }
            : { href: "/my-data", label: "ของฉัน", icon: IconUser },
        ];

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur sm:hidden"
      // กันโดนแถบ home indicator ของ iPhone ทับ
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="mx-auto flex max-w-lg">
        {items.map((it) => {
          const path = it.href.split(/[?#]/)[0];
          const active = it.match ? pathname.startsWith(it.match) : pathname === path;
          return (
            <li key={it.href} className="flex-1">
              <Link
                href={it.href}
                className={`relative flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium transition-colors ${
                  active ? "text-brand-dark" : "text-slate-400"
                }`}
              >
                <span
                  className={`grid h-8 w-12 place-items-center rounded-full transition-colors ${
                    active ? "bg-brand-soft" : ""
                  }`}
                >
                  <span className="block h-[22px] w-[22px]">{it.icon}</span>
                  {it.badge ? (
                    <span className="absolute right-[22%] top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                      {it.badge > 9 ? "9+" : it.badge}
                    </span>
                  ) : null}
                </span>
                <span className="whitespace-nowrap">{it.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
