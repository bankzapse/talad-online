import AdminNav from "@/components/AdminNav";
import { getPayments, getSellers, getPackages } from "@/lib/data";
import { signSlipUrl } from "@/lib/slip";
import { formatBaht, formatBahtExact, timeAgo, daysLeft } from "@/lib/format";
import {
  verifyPaymentAction,
  rejectPaymentAction,
  adjustExpiryAction,
} from "@/app/actions";
import SubmitButton from "@/components/SubmitButton";

export const dynamic = "force-dynamic";

const STATUS: Record<string, { label: string; cls: string }> = {
  pending: { label: "รอตรวจ", cls: "border-amber-200 bg-amber-50 text-amber-600" },
  verified: { label: "ยืนยันแล้ว", cls: "border-brand/30 bg-brand-light text-brand-dark" },
  rejected: { label: "ปฏิเสธ", cls: "border-red-200 bg-red-50 text-red-600" },
};

export default async function Payments() {
  const [payments, packages, allSellers] = await Promise.all([
    getPayments(),
    getPackages(),
    getSellers(),
  ]);
  const sellers = new Map(allSellers.map((s) => [s.id, s]));
  const slipUrls = new Map(
    await Promise.all(
      payments.map(async (p) => [p.id, await signSlipUrl(p.slipUrl)] as const)
    )
  );

  return (
    <div>
      <h1 className="mb-4 text-xl font-bold">การชำระเงิน</h1>
      <AdminNav active="payments" />

      <p className="mb-3 text-sm text-slate-500">
        ยืนยันการจ่าย = ต่ออายุแบบ &ldquo;ต่อท้ายวันเดิม&rdquo; อัตโนมัติ · เก็บ log ทุกครั้ง
      </p>

      {payments.length === 0 ? (
        <div className="card p-8 text-center text-slate-400">
          ยังไม่มีรายการชำระเงิน — ไปที่หน้า &ldquo;สมาชิก&rdquo; ฝั่งผู้ขายเพื่อทดลองจ่าย
        </div>
      ) : (
        <div className="space-y-2">
          {payments.map((p) => {
            const seller = sellers.get(p.sellerId);
            const pkg = packages.find((x) => x.id === p.packageId);
            const st = STATUS[p.status];
            const verify = verifyPaymentAction.bind(null, p.id);
            const reject = rejectPaymentAction.bind(null, p.id);
            return (
              <div key={p.id} className="card flex flex-wrap items-center gap-3 p-3">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium">
                    {seller?.displayName} · {pkg?.name}
                  </div>
                  <div className="text-xs text-slate-400">
                    {formatBahtExact(p.amount)} · {timeAgo(p.createdAt)} · สลิป:{" "}
                    {slipUrls.get(p.id) ? (
                      <a
                        href={slipUrls.get(p.id)!}
                        target="_blank"
                        rel="noreferrer"
                        className="text-brand underline"
                      >
                        ดูสลิป
                      </a>
                    ) : p.slipUrl ? (
                      "แนบแล้ว"
                    ) : (
                      "—"
                    )}
                  </div>
                </div>
                <span className={`chip ${st.cls}`}>{st.label}</span>
                {p.status === "pending" && (
                  <div className="flex gap-1">
                    <form action={verify}>
                      <SubmitButton className="btn-primary px-3 py-1 text-xs" pendingText="ยืนยัน…">ยืนยัน (ยอดตรง)</SubmitButton>
                    </form>
                    <form action={reject}>
                      <SubmitButton className="btn-outline px-3 py-1 text-xs">ปฏิเสธ</SubmitButton>
                    </form>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <h2 className="mt-8 mb-2 text-sm font-medium text-slate-500">
        ปรับวันหมดอายุด้วยมือ (grace period / คืนเงิน / แก้เคสระบบพลาด)
      </h2>
      <div className="space-y-2">
        {[...new Set(payments.map((p) => p.sellerId))].length === 0 && (
          <p className="text-xs text-slate-400">— (จะมีรายการเมื่อมีผู้ขายจ่ายเงิน)</p>
        )}
        {[...sellers.values()].filter(Boolean).map((s) => {
          const adjust = adjustExpiryAction.bind(null, s!.id);
          const dleft = daysLeft(s!.membershipExpiresAt);
          return (
            <form key={s!.id} action={adjust} className="card flex flex-wrap items-center gap-2 p-3">
              <div className="min-w-0 flex-1 text-sm">
                {s!.displayName}{" "}
                <span className="text-xs text-slate-400">
                  ({dleft !== null && dleft > 0 ? `เหลือ ${dleft} วัน` : "หมดอายุ"})
                </span>
              </div>
              <input name="days" type="number" defaultValue={3} className="input w-20" />
              <input name="reason" placeholder="เหตุผล" className="input w-40" />
              <SubmitButton className="btn-outline px-3 py-1 text-xs">+ วัน</SubmitButton>
            </form>
          );
        })}
      </div>
    </div>
  );
}
