import Link from "next/link";
import { getModerationQueue, getPayments } from "@/lib/data";

export default async function AdminNav({ active }: { active: string }) {
  const queue = (await getModerationQueue()).length;
  const pendingPay = (await getPayments()).filter((p) => p.status === "pending").length;

  const items = [
    { key: "home", href: "/admin", label: "ภาพรวม" },
    { key: "moderation", href: "/admin/moderation", label: `คิวตรวจ${queue ? ` (${queue})` : ""}` },
    { key: "payments", href: "/admin/payments", label: `การชำระเงิน${pendingPay ? ` (${pendingPay})` : ""}` },
    { key: "packages", href: "/admin/packages", label: "แพ็กสมาชิก" },
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
    </div>
  );
}
