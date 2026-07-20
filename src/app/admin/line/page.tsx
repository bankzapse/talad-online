import AdminNav from "@/components/AdminNav";
import { getSellers } from "@/lib/data";
import { getLineStatus, isFriendWithOA } from "@/lib/line";
import { NOTIFY } from "@/lib/notify";

export const dynamic = "force-dynamic";

const EVENT_LABEL: Record<string, string> = {
  order_new: "มีออร์เดอร์ใหม่ → ร้าน",
  order_confirmed: "ร้านยืนยันแล้ว → ผู้ซื้อ",
  order_shipped: "จัดส่ง + เลขพัสดุ → ผู้ซื้อ",
  order_cancelled: "ยกเลิกรายการ → อีกฝ่าย",
  listing_approved: "อนุมัติประกาศ → ร้าน",
  listing_rejected: "ตีกลับ/ระงับประกาศ → ร้าน",
};

export default async function AdminLine() {
  const status = await getLineStatus();
  const sellers = await getSellers();

  // เช็คทีละร้านว่าเพิ่มเพื่อน OA แล้วหรือยัง
  const friends = status.tokenValid
    ? new Map(
        await Promise.all(
          sellers.map(async (s) => [s.id, await isFriendWithOA(s.lineUserId)] as const)
        )
      )
    : new Map();

  const onCount = Object.values(NOTIFY).filter(Boolean).length;
  const quotaLeft =
    status.quotaTotal !== undefined && status.quotaUsed !== undefined
      ? status.quotaTotal - status.quotaUsed
      : null;

  return (
    <div>
      <h1 className="mb-4 text-xl font-bold">สถานะแจ้งเตือน LINE</h1>
      <AdminNav active="line" />

      {/* ---- สถานะ OA ---- */}
      <section className="card p-5">
        {!status.configured ? (
          <div className="text-sm text-red-600">
            ❌ ยังไม่ได้ตั้งค่า <code>LINE_CHANNEL_ACCESS_TOKEN</code> — ระบบไม่ส่งแจ้งเตือนเลย
          </div>
        ) : !status.tokenValid ? (
          <div className="text-sm text-red-600">
            ❌ Token ใช้ไม่ได้ (อาจถูกออกใหม่หรือหมดอายุ) — ออก token ใหม่ที่ LINE Developers
            แล้วอัปเดตใน Vercel
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <span className="chip border-brand/30 bg-brand-light text-brand-dark">
                ✓ เชื่อมต่อแล้ว
              </span>
              <span className="font-medium text-ink">{status.oaName}</span>
              <span className="text-sm text-slate-400">{status.basicId}</span>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <Stat label="โควตาเดือนนี้" value={`${status.quotaTotal ?? "—"}`} />
              <Stat label="ส่งไปแล้ว" value={`${status.quotaUsed ?? "—"}`} />
              <Stat
                label="เหลือ"
                value={quotaLeft !== null ? `${quotaLeft}` : "—"}
                warn={quotaLeft !== null && quotaLeft < 50}
              />
            </div>

            {quotaLeft !== null && quotaLeft < 50 && (
              <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
                ⚠️ โควตาใกล้หมด — เมื่อหมดแล้วข้อความจะไม่ถูกส่งออกและไม่มีใครได้รับแจ้งเตือน
                พิจารณาอัปแพ็ก LINE OA หรือปิดแจ้งเตือนบางจังหวะ
              </p>
            )}
          </>
        )}
      </section>

      {/* ---- จังหวะที่ส่ง ---- */}
      <section className="mt-5">
        <h2 className="mb-2 text-sm font-medium text-slate-500">
          จังหวะที่ส่งแจ้งเตือน ({onCount}/{Object.keys(NOTIFY).length} เปิดอยู่)
        </h2>
        <div className="card divide-y divide-slate-100">
          {Object.entries(NOTIFY).map(([k, on]) => (
            <div key={k} className="flex items-center justify-between p-3 text-sm">
              <span className={on ? "text-slate-700" : "text-slate-400"}>
                {EVENT_LABEL[k] ?? k}
              </span>
              <span
                className={`chip ${
                  on
                    ? "border-brand/30 bg-brand-light text-brand-dark"
                    : "border-slate-200 bg-slate-50 text-slate-400"
                }`}
              >
                {on ? "เปิด" : "ปิด"}
              </span>
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs text-slate-400">
          * แก้ได้ที่ <code>src/lib/notify.ts</code> — ปิดจังหวะที่ไม่จำเป็นเพื่อประหยัดโควตา
        </p>
      </section>

      {/* ---- ร้านที่จะได้รับแจ้งเตือนจริง ---- */}
      <section className="mt-5">
        <h2 className="mb-2 text-sm font-medium text-slate-500">
          ร้านค้า — เพิ่มเพื่อน OA แล้วหรือยัง
        </h2>
        <p className="mb-2 text-xs text-slate-400">
          LINE ห้ามส่งข้อความหาคนที่ยังไม่เพิ่มเพื่อน — ร้านที่ยังไม่เพิ่มจะ<b>ไม่ได้รับออร์เดอร์ใหม่</b>
          ทั้งที่ระบบส่งสำเร็จ
        </p>
        <div className="card divide-y divide-slate-100">
          {sellers.length === 0 && (
            <div className="p-4 text-center text-sm text-slate-400">ยังไม่มีร้านค้า</div>
          )}
          {sellers.map((s) => {
            const f = friends.get(s.id);
            return (
              <div key={s.id} className="flex items-center justify-between gap-3 p-3 text-sm">
                <span className="min-w-0 truncate">
                  {s.shopName ?? s.displayName}
                  {!s.lineUserId && (
                    <span className="ml-2 text-xs text-slate-400">(ไม่ได้ล็อกอินด้วย LINE)</span>
                  )}
                </span>
                <span
                  className={`chip shrink-0 ${
                    f === true
                      ? "border-brand/30 bg-brand-light text-brand-dark"
                      : f === false
                      ? "border-red-200 bg-red-50 text-red-600"
                      : "border-slate-200 bg-slate-50 text-slate-400"
                  }`}
                >
                  {f === true ? "✓ เพิ่มเพื่อนแล้ว" : f === false ? "✗ ยังไม่เพิ่ม" : "ตรวจไม่ได้"}
                </span>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className={`rounded-xl border p-3 ${warn ? "border-amber-200 bg-amber-50" : "border-slate-200"}`}>
      <div className="text-xs text-slate-400">{label}</div>
      <div className={`mt-0.5 text-xl font-bold ${warn ? "text-amber-700" : "text-ink"}`}>
        {value}
      </div>
    </div>
  );
}
