import AdminNav from "@/components/AdminNav";
import { getModerationQueue, getSellers, getCategories } from "@/lib/data";
import { timeAgo } from "@/lib/format";
import { moderateAction, rejectListingAction } from "@/app/actions";
import SubmitButton from "@/components/SubmitButton";

export const dynamic = "force-dynamic";

export default async function Moderation() {
  const [queue, sellers, categories] = await Promise.all([
    getModerationQueue(),
    getSellers(),
    getCategories(),
  ]);
  const sellerMap = new Map(sellers.map((s) => [s.id, s]));
  const catMap = new Map(categories.map((c) => [c.id, c]));

  return (
    <div>
      <h1 className="mb-4 text-xl font-bold">คิวตรวจประกาศ</h1>
      <AdminNav active="moderation" />

      <p className="mb-3 text-sm text-slate-500">
        <b>ทุกประกาศต้องผ่านการอนุมัติที่นี่ก่อนแสดงต่อผู้ซื้อ</b> — ผู้ขายกดส่งขออนุมัติแล้วเข้าคิวนี้
        รวมถึงประกาศที่ติดคำต้องห้ามหรือถูกผู้ใช้รายงาน
      </p>

      {queue.length === 0 ? (
        <div className="card p-10 text-center text-slate-400">✓ ไม่มีประกาศค้างตรวจ</div>
      ) : (
        <div className="space-y-2">
          {queue.map((l) => {
            const seller = sellerMap.get(l.sellerId);
            const cat = catMap.get(l.categoryId);
            const approve = moderateAction.bind(null, l.id, "approve");
            const remove = moderateAction.bind(null, l.id, "remove");
            const reject = rejectListingAction.bind(null, l.id);
            return (
              <div key={l.id} className="card p-3">
                <div className="flex items-start gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xl">
                    {cat?.emoji}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium">{l.title}</div>
                    <div className="text-xs text-slate-400">
                      {seller?.displayName} · {timeAgo(l.createdAt)}
                    </div>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {l.flaggedKeywords.map((k) => (
                        <span key={k} className="chip border-red-200 bg-red-50 text-red-600">
                          คำต้องห้าม: {k}
                        </span>
                      ))}
                      {l.reportCount > 0 && (
                        <span className="chip border-amber-200 bg-amber-50 text-amber-600">
                          ถูกรายงาน {l.reportCount} ครั้ง
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col gap-1">
                    <form action={approve}>
                      <SubmitButton
                        className="btn-primary w-full px-3 py-1 text-xs"
                        pendingText="กำลังอนุมัติ…"
                      >
                        ✓ อนุมัติ — แสดงเลย
                      </SubmitButton>
                    </form>
                    <form action={reject} className="flex gap-1">
                      <input
                        name="note"
                        placeholder="เหตุผล"
                        className="input w-24 py-1 text-xs"
                      />
                      <SubmitButton className="btn-outline px-2 py-1 text-xs">
                        ตีกลับ
                      </SubmitButton>
                    </form>
                    <form action={remove}>
                      <SubmitButton className="btn w-full bg-red-500 px-3 py-1 text-xs text-white hover:bg-red-600">
                        ระงับถาวร
                      </SubmitButton>
                    </form>
                  </div>
                </div>
                <p className="mt-2 rounded bg-slate-50 p-2 text-xs text-slate-500">
                  {l.description}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
