import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentSeller } from "@/lib/auth";
import { getPackages } from "@/lib/data";
import { daysLeft } from "@/lib/format";
import { startTrialAction, payAction } from "@/app/actions";
import SlipUpload from "@/components/SlipUpload";

export const dynamic = "force-dynamic";

export default async function Membership({
  searchParams,
}: {
  searchParams: Promise<{ paid?: string; error?: string }>;
}) {
  const seller = await getCurrentSeller();
  if (!seller) redirect("/login");
  const sp = await searchParams;
  const packages = await getPackages(true);
  const dleft = daysLeft(seller.membershipExpiresAt);
  const pay = payAction.bind(null, seller.id);

  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/sell" className="mb-4 inline-block text-sm text-slate-400 hover:text-slate-600">
        ← กลับร้านของฉัน
      </Link>

      <h1 className="text-xl font-bold">สมาชิกผู้ขาย</h1>

      {sp.paid === "1" && (
        <div className="mt-3 rounded-lg border border-brand/30 bg-brand-light p-3 text-sm text-brand-dark">
          ✓ ส่งสลิปแล้ว! รอทีมงาน/ระบบยืนยันยอด เมื่อยืนยันแล้วสมาชิกจะต่ออายุทันที
          (ดูสถานะได้ที่ admin → การชำระเงิน)
        </div>
      )}
      {sp.error === "noslip" && (
        <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
          กรุณาแนบสลิปการโอนก่อนกดยืนยัน
        </div>
      )}

      <div className="mt-3 text-sm text-slate-600">
        {dleft !== null && dleft > 0 ? (
          <>สมาชิกปัจจุบันเหลือ <b>{dleft} วัน</b> · ต่ออายุก่อนหมดจะ &ldquo;ต่อท้ายวันเดิม&rdquo;</>
        ) : seller.trialUsed ? (
          <>สมาชิกหมดอายุแล้ว — เลือกแพ็กเพื่อกลับมาแสดงประกาศ</>
        ) : (
          <>คุณยังไม่เคยใช้สิทธิ์ทดลอง</>
        )}
      </div>

      {!seller.trialUsed && (
        <form action={startTrialAction.bind(null, seller.id)} className="mt-4">
          <button className="btn-primary w-full py-3">🎁 เริ่มทดลองฟรี 30 วัน (ไม่ต้องจ่าย)</button>
        </form>
      )}

      {/* ขั้นตอนจ่าย: สแกน QR → โอน → แนบสลิป → เลือกแพ็ก → ยืนยัน */}
      <form action={pay} className="mt-6 card p-5">
        <h2 className="text-sm font-medium text-slate-700">ต่ออายุสมาชิก</h2>

        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-start">
          <div className="flex h-36 w-36 shrink-0 items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 text-center text-xs text-slate-400">
            [ PromptPay QR<br />บัญชีธุรกิจ ]
          </div>
          <div className="flex-1 text-sm text-slate-600">
            <p className="font-medium">วิธีจ่าย</p>
            <ol className="mt-1 list-decimal space-y-0.5 pl-5 text-xs">
              <li>เลือกแพ็กด้านล่าง</li>
              <li>สแกน QR แล้วโอนตามยอด</li>
              <li>แนบสลิป แล้วกด &ldquo;ยืนยันการชำระ&rdquo;</li>
              <li>ระบบ/แอดมินตรวจยอด → ต่ออายุอัตโนมัติ</li>
            </ol>
          </div>
        </div>

        <div className="mt-4">
          <div className="mb-2 text-xs font-medium text-slate-500">เลือกแพ็ก</div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {packages.map((p, i) => {
              const perMonth = Math.round((p.price / p.days) * 30);
              return (
                <label
                  key={p.id}
                  className="card cursor-pointer p-3 text-center has-[:checked]:border-brand has-[:checked]:bg-brand-light"
                >
                  <input
                    type="radio"
                    name="packageId"
                    value={p.id}
                    defaultChecked={i === 1}
                    className="sr-only"
                  />
                  <div className="text-xs font-medium text-slate-700">{p.name}</div>
                  <div className="text-lg font-bold text-brand-dark">{p.price}฿</div>
                  <div className="text-[10px] text-slate-400">~{perMonth}฿/ด.</div>
                </label>
              );
            })}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <SlipUpload />
        </div>

        <button className="btn-primary mt-4 w-full py-3">ยืนยันการชำระ (ส่งสลิป)</button>
        <p className="mt-2 text-xs text-slate-400">
          ตรวจสลิปกับธนาคารอัตโนมัติเมื่อเชื่อม API (SlipOK/slip2go) — ระหว่างนี้แอดมินยืนยันมือได้
        </p>
      </form>
    </div>
  );
}
