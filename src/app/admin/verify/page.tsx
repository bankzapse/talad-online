import AdminNav from "@/components/AdminNav";
import { getPendingVerifications } from "@/lib/data";
import { getServiceClient, isSupabaseReady } from "@/lib/supabase/admin";
import { reviewVerificationAction } from "@/app/actions";
import SubmitButton from "@/components/SubmitButton";

export const dynamic = "force-dynamic";

async function signDoc(path: string | null): Promise<string | null> {
  if (!path || !isSupabaseReady()) return null;
  const { data } = await getServiceClient()!
    .storage.from("docs")
    .createSignedUrl(path, 60 * 30);
  return data?.signedUrl ?? null;
}

export default async function AdminVerify() {
  const pending = await getPendingVerifications();
  const docs = new Map(
    await Promise.all(pending.map(async (s) => [s.id, await signDoc(s.bookBankUrl)] as const))
  );

  return (
    <div>
      <h1 className="mb-4 text-xl font-bold">อนุมัติร้านค้า</h1>
      <AdminNav active="verify" />

      <p className="mb-3 text-sm text-slate-500">
        ร้านที่ยื่นเอกสารขอยืนยัน — อนุมัติแล้วจะใช้วิธีรับของแบบ &ldquo;โอนเงินก่อน&rdquo; ได้
        และได้ป้ายร้านยืนยัน
      </p>

      {pending.length === 0 ? (
        <div className="card p-10 text-center text-slate-400">✓ ไม่มีร้านรออนุมัติ</div>
      ) : (
        <div className="space-y-3">
          {pending.map((s) => {
            const approve = reviewVerificationAction.bind(null, s.id, true);
            const reject = reviewVerificationAction.bind(null, s.id, false);
            const doc = docs.get(s.id);
            return (
              <div key={s.id} className="card p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-semibold text-ink">{s.shopName ?? s.displayName}</div>
                    <div className="mt-1 space-y-0.5 text-xs text-slate-500">
                      <div>📞 {s.contactPhone ?? "—"}</div>
                      <div>
                        🏦 {s.bankName ?? "—"} · {s.bankAccountNo ?? "—"} ·{" "}
                        {s.bankAccountName ?? "—"}
                      </div>
                      {s.companyName && <div>🏢 {s.companyName}</div>}
                      <div>
                        📄 เอกสาร:{" "}
                        {doc ? (
                          <a href={doc} target="_blank" rel="noreferrer" className="text-brand underline">
                            เปิดดูหน้าสมุดบัญชี
                          </a>
                        ) : s.bookBankUrl ? (
                          "แนบแล้ว (สร้างลิงก์ไม่ได้)"
                        ) : (
                          "ไม่ได้แนบ"
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-col gap-2">
                    <form action={approve}>
                      <SubmitButton className="btn-primary w-full px-4 py-1.5 text-xs" pendingText="อนุมัติ…">
                        ✓ อนุมัติ
                      </SubmitButton>
                    </form>
                    <form action={reject} className="flex gap-1">
                      <input name="note" placeholder="เหตุผล" className="input w-32 py-1 text-xs" />
                      <SubmitButton className="btn-outline px-3 py-1.5 text-xs">ปฏิเสธ</SubmitButton>
                    </form>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
