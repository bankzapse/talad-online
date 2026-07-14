import AdminNav from "@/components/AdminNav";
import { getAnalytics, getSellers, getAdminLogs } from "@/lib/data";
import { formatBaht, daysLeft, timeAgo } from "@/lib/format";
import { toggleBlockAction } from "@/app/actions";

export const dynamic = "force-dynamic";

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="card p-4">
      <div className="text-xs text-slate-400">{label}</div>
      <div className="mt-1 text-2xl font-bold text-slate-800">{value}</div>
      {hint && <div className="text-xs text-slate-400">{hint}</div>}
    </div>
  );
}

export default async function AdminHome() {
  const [a, sellers, logs] = await Promise.all([
    getAnalytics(),
    getSellers(),
    getAdminLogs(),
  ]);

  return (
    <div>
      <h1 className="mb-1 text-xl font-bold">แผงควบคุม Admin</h1>
      <p className="mb-4 text-xs text-slate-400">
        (โหมด demo ไม่มีการล็อกอิน — production ต้องจำกัดสิทธิ์เข้าถึงหน้านี้)
      </p>
      <AdminNav active="home" />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="รายได้ (ยืนยันแล้ว)" value={formatBaht(a.revenue)} />
        <Stat label="ผู้ขายจ่ายเงิน" value={`${a.payingSellers}`} hint={`เป้าเลี้ยงตัวเอง ~100`} />
        <Stat label="ประกาศที่แสดง" value={`${a.activeListings}`} />
        <Stat label="conversion ทดลอง→จ่าย" value={`${a.conversion}%`} />
        <Stat label="ยอดกด ติดต่อ" value={`${a.contactClicked}`} hint="สะสม" />
        <Stat label="ประกาศทั้งหมด (สร้าง)" value={`${a.listingsCreated}`} />
        <Stat label="รอตรวจสอบ" value={`${a.pendingReview}`} />
        <Stat label="ผู้ขายทั้งหมด" value={`${a.sellersTotal}`} />
      </div>

      <div className="mt-6 grid gap-5 md:grid-cols-2">
        <div>
          <h2 className="mb-2 text-sm font-medium text-slate-500">ผู้ขาย</h2>
          <div className="space-y-2">
            {sellers.map((s) => {
              const dleft = daysLeft(s.membershipExpiresAt);
              const toggle = toggleBlockAction.bind(null, s.id, !s.blocked);
              return (
                <div key={s.id} className="card flex items-center gap-2 p-3">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{s.displayName}</div>
                    <div className="text-xs text-slate-400">
                      {s.phone} ·{" "}
                      {dleft !== null && dleft > 0
                        ? `เหลือ ${dleft} วัน`
                        : s.trialUsed
                        ? "หมดอายุ"
                        : "ยังไม่ทดลอง"}
                      {s.blocked && " · 🚫 ถูกแบน"}
                    </div>
                  </div>
                  <form action={toggle}>
                    <button className="btn-outline px-2 py-1 text-xs">
                      {s.blocked ? "ปลดแบน" : "แบน"}
                    </button>
                  </form>
                </div>
              );
            })}
          </div>
        </div>

        <div>
          <h2 className="mb-2 text-sm font-medium text-slate-500">บันทึกการทำงาน (log)</h2>
          <div className="card divide-y divide-slate-100">
            {logs.length === 0 && (
              <div className="p-4 text-center text-xs text-slate-400">ยังไม่มีบันทึก</div>
            )}
            {logs.slice(0, 12).map((l) => (
              <div key={l.id} className="p-3 text-xs">
                <span className="font-medium text-slate-700">{l.action}</span>{" "}
                <span className="text-slate-500">— {l.detail}</span>
                <div className="text-slate-300">{timeAgo(l.createdAt)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
