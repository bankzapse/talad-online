import Link from "next/link";
import { getModerationQueue, getPayments, getPendingVerifications } from "@/lib/data";
import { logoutAdmin } from "@/app/actions";

export default async function AdminNav({ active }: { active: string }) {
  const queue = (await getModerationQueue()).length;
  const pendingPay = (await getPayments()).filter((p) => p.status === "pending").length;
  const pendingVerify = (await getPendingVerifications()).length;

  const items = [
    { key: "home", href: "/admin", label: "ภาพรวม" },
    { key: "moderation", href: "/admin/moderation", label: `คิวตรวจ${queue ? ` (${queue})` : ""}` },
    { key: "categories", href: "/admin/categories", label: "ประเภทสินค้า" },
    { key: "verify", href: "/admin/verify", label: `อนุมัติร้าน${pendingVerify ? ` (${pendingVerify})` : ""}` },
    { key: "payments", href: "/admin/payments", label: `การชำระเงิน${pendingPay ? ` (${pendingPay})` : ""}` },
    { key: "reports", href: "/admin/reports", label: "สรุปรายได้" },
    { key: "packages", href: "/admin/packages", label: "แพ็กสมาชิก" },
    { key: "line", href: "/admin/line", label: "แจ้งเตือน LINE" },
    { key: "settings", href: "/admin/settings", label: "ตั้งค่าบัญชี" },
  ];

  return (
    <div className="mb-5 flex flex-wrap gap-1 border-b border-slate-200 pb-2">
      {items.map((it) => (
        <Link
          key={it.key}
          href={it.href}
          className={`rounded-lg px-3 py-1.5 text-sm ${
            active === it.key
              ? "bg-brand-light font-medium text-brand-dark"
              : "text-slate-500 hover:bg-slate-100"
          }`}
        >
          {it.label}
        </Link>
      ))}
      <form action={logoutAdmin} className="ml-auto">
        <button className="rounded-lg px-3 py-1.5 text-sm text-slate-400 hover:bg-red-50 hover:text-red-600">
          ออกจากระบบ admin
        </button>
      </form>
    </div>
  );
}
