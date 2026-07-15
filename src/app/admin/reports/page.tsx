import AdminNav from "@/components/AdminNav";
import ReportExport from "@/components/ReportExport";
import { getPayments } from "@/lib/data";
import { formatBaht } from "@/lib/format";

export const dynamic = "force-dynamic";

const TH_MONTHS = [
  "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
  "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค.",
];

export default async function AdminReports() {
  const payments = (await getPayments()).filter((p) => p.status === "verified");
  const now = new Date();
  const sum = (arr: typeof payments) => arr.reduce((s, p) => s + p.amount, 0);

  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const thisWeek = sum(payments.filter((p) => new Date(p.verifiedAt || p.createdAt).getTime() >= weekAgo));
  const thisMonth = sum(
    payments.filter((p) => {
      const d = new Date(p.verifiedAt || p.createdAt);
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    })
  );
  const thisYear = sum(
    payments.filter((p) => new Date(p.verifiedAt || p.createdAt).getFullYear() === now.getFullYear())
  );
  const allTime = sum(payments);

  // จัดกลุ่มรายเดือน (YYYY-MM)
  const byMonth = new Map<string, { count: number; revenue: number }>();
  for (const p of payments) {
    const d = new Date(p.verifiedAt || p.createdAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const cur = byMonth.get(key) ?? { count: 0, revenue: 0 };
    cur.count += 1;
    cur.revenue += p.amount;
    byMonth.set(key, cur);
  }
  const rows = [...byMonth.entries()]
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .slice(0, 12)
    .map(([month, v]) => ({ month, count: v.count, revenue: v.revenue }));

  return (
    <div>
      <h1 className="mb-4 text-xl font-bold">สรุปรายได้</h1>
      <AdminNav active="reports" />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="7 วันล่าสุด" value={formatBaht(thisWeek)} />
        <Stat label="เดือนนี้" value={formatBaht(thisMonth)} />
        <Stat label="ปีนี้" value={formatBaht(thisYear)} />
        <Stat label="ทั้งหมด" value={formatBaht(allTime)} hint={`${payments.length} รายการ`} />
      </div>

      <div className="mt-6 flex items-center justify-between">
        <h2 className="text-sm font-medium text-slate-500">รายได้รายเดือน (12 เดือนล่าสุด)</h2>
        {rows.length > 0 && <ReportExport rows={rows} />}
      </div>

      <div className="mt-2 card overflow-hidden">
        {rows.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-400">ยังไม่มีรายได้ที่ยืนยันแล้ว</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs text-slate-400">
                <th className="p-3">เดือน</th>
                <th className="p-3 text-right">จำนวนรายการ</th>
                <th className="p-3 text-right">รายได้</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const [y, m] = r.month.split("-");
                return (
                  <tr key={r.month} className="border-b border-slate-50">
                    <td className="p-3">{TH_MONTHS[Number(m) - 1]} {Number(y) + 543}</td>
                    <td className="p-3 text-right text-slate-500">{r.count}</td>
                    <td className="p-3 text-right font-semibold text-brand-dark">
                      {formatBaht(r.revenue)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="card p-4">
      <div className="text-xs text-slate-400">{label}</div>
      <div className="mt-1 text-xl font-bold text-slate-800">{value}</div>
      {hint && <div className="text-xs text-slate-400">{hint}</div>}
    </div>
  );
}
