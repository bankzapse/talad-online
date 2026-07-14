import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentSeller } from "@/lib/auth";
import { getPackages } from "@/lib/data";
import { formatBaht, daysLeft } from "@/lib/format";
import { startTrialAction, payAction } from "@/app/actions";

export const dynamic = "force-dynamic";

export default async function Membership({
  searchParams,
}: {
  searchParams: Promise<{ paid?: string }>;
}) {
  const seller = await getCurrentSeller();
  if (!seller) redirect("/login");
  const sp = await searchParams;
  const packages = getPackages(true);
  const dleft = daysLeft(seller.membershipExpiresAt);

  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/sell" className="mb-4 inline-block text-sm text-slate-400 hover:text-slate-600">
        ← กลับร้านของฉัน
      </Link>

      <h1 className="text-xl font-bold">สมาชิกผู้ขาย</h1>

      {sp.paid === "1" && (
        <div className="mt-3 rounded-lg border border-brand/30 bg-brand-light p-3 text-sm text-brand-dark">
          ✓ อัปสลิปแล้ว! ระบบกำลังตรวจสอบยอดกับธนาคารอัตโนมัติ เมื่อยืนยันแล้วสมาชิกจะต่ออายุทันที
          (ในโหมด demo — ไปกดยืนยันได้ที่หน้า admin → การชำระเงิน)
        </div>
      )}

      <div className="mt-3 text-sm text-slate-600">
        {dleft !== null && dleft > 0 ? (
          <>สมาชิกปัจจุบันเหลือ <b>{dleft} วัน</b> · ต่ออายุก่อนหมดจะ &ldquo;ต่อท้ายวันเดิม&rdquo; ไม่เริ่มนับใหม่</>
        ) : seller.trialUsed ? (
          <>สมาชิกหมดอายุแล้ว — เลือกแพ็กเพื่อกลับมาแสดงประกาศ</>
        ) : (
          <>คุณยังไม่เคยใช้สิทธิ์ทดลอง</>
        )}
      </div>

      {!seller.trialUsed && (
        <form action={startTrialAction.bind(null, seller.id)} className="mt-4">
          <button className="btn-primary w-full py-3">
            🎁 เริ่มทดลองฟรี 30 วัน (ไม่ต้องจ่าย)
          </button>
        </form>
      )}

      <h2 className="mt-6 mb-2 text-sm font-medium text-slate-500">เลือกแพ็ก</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {packages.map((p) => {
          const perMonth = Math.round((p.price / p.days) * 30);
          const pay = payAction.bind(null, seller.id, p.id);
          return (
            <div key={p.id} className="card p-4 text-center">
              <div className="text-sm font-medium text-slate-700">{p.name}</div>
              <div className="mt-1 text-2xl font-bold text-brand-dark">{p.price}฿</div>
              <div className="text-xs text-slate-400">~{perMonth}฿/เดือน</div>
              <form action={pay} className="mt-3">
                <button className="btn-outline w-full py-2 text-sm">เลือก</button>
              </form>
            </div>
          );
        })}
      </div>

      <div className="mt-6 card p-5">
        <h3 className="text-sm font-medium text-slate-700">วิธีจ่าย: PromptPay QR + อัปสลิป</h3>
        <div className="mt-3 flex flex-col items-center gap-3 sm:flex-row sm:items-start">
          <div className="flex h-40 w-40 shrink-0 items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 text-center text-xs text-slate-400">
            [ PromptPay QR<br />ของบัญชีธุรกิจ ]
          </div>
          <ol className="list-decimal space-y-1 pl-5 text-sm text-slate-600">
            <li>เลือกแพ็กด้านบน (กด &ldquo;เลือก&rdquo;)</li>
            <li>สแกน QR แล้วโอนตามยอด</li>
            <li>อัปโหลดสลิป</li>
            <li>
              ระบบ<b>ตรวจสลิปกับธนาคารอัตโนมัติ</b> (SlipOK/slip2go) → ยอดตรง = ต่ออายุทันที
            </li>
            <li>เตือนก่อนหมดอายุทาง LINE</li>
          </ol>
        </div>
        <p className="mt-3 text-xs text-slate-400">
          ต้นทุนตรวจสลิปถูกกว่า payment gateway (ไม่โดนหัก %) และกันสลิปปลอมได้ — อ้างอิงบท
          &ldquo;ตัดสินใจ 3 Blocker&rdquo; ในแผน
        </p>
      </div>
    </div>
  );
}
