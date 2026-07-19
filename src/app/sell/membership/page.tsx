import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentSeller } from "@/lib/auth";
import { getPackages, getSellerPayments, getPaymentSettings } from "@/lib/data";
import { daysLeft, formatBahtExact, timeAgo } from "@/lib/format";
import { startTrialAction, payAction, resubmitSlipAction } from "@/app/actions";
import SlipUpload from "@/components/SlipUpload";
import SubmitButton from "@/components/SubmitButton";
import PackagePicker from "@/components/PackagePicker";
import { promptPayQrDataUrl } from "@/lib/promptpay";
import { TRIAL_DAYS } from "@/lib/packages";

export const dynamic = "force-dynamic";

export default async function Membership({
  searchParams,
}: {
  searchParams: Promise<{ paid?: string; error?: string }>;
}) {
  const seller = await getCurrentSeller();
  if (!seller) redirect("/login");
  const sp = await searchParams;
  const [packages, allPackages, payments, bank] = await Promise.all([
    getPackages(true),
    getPackages(),
    getSellerPayments(seller.id),
    getPaymentSettings(),
  ]);
  const pkgMap = new Map(allPackages.map((p) => [p.id, p]));
  const dleft = daysLeft(seller.membershipExpiresAt);
  const pay = payAction.bind(null, seller.id);

  // เลขลงท้าย (สตางค์) เป็นรหัสอ้างอิง + สร้าง PromptPay QR ต่อยอด (ถ้าตั้ง PromptPay ID)
  const satang = 1 + Math.floor(Math.random() * 99);
  const ss = String(satang).padStart(2, "0");
  const pickerPackages = await Promise.all(
    packages.map(async (p) => {
      const total = p.price + satang / 100;
      return {
        id: p.id,
        name: p.name,
        price: p.price,
        days: p.days,
        amount: total.toFixed(2),
        ss,
        qr: bank.promptpayId ? await promptPayQrDataUrl(bank.promptpayId, total) : null,
      };
    })
  );

  const PAY_STATUS: Record<string, { label: string; cls: string }> = {
    pending: { label: "รอตรวจสอบ", cls: "border-amber-200 bg-amber-50 text-amber-600" },
    verified: { label: "ยืนยันแล้ว", cls: "border-brand/30 bg-brand-light text-brand-dark" },
    rejected: { label: "ถูกปฏิเสธ", cls: "border-red-200 bg-red-50 text-red-600" },
  };

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
          <SubmitButton className="btn-primary w-full py-3" pendingText="กำลังเริ่ม…">
            🎁 เริ่มทดลองฟรี {TRIAL_DAYS} วัน (ไม่ต้องจ่าย)
          </SubmitButton>
        </form>
      )}

      {/* ขั้นตอนจ่าย: สแกน QR → โอน → แนบสลิป → เลือกแพ็ก → ยืนยัน */}
      <form action={pay} className="mt-6 card p-5">
        <h2 className="text-sm font-medium text-slate-700">ต่ออายุสมาชิก</h2>

        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-start">
          <div className="w-full rounded-xl border border-brand/20 bg-brand-soft/50 p-4 text-sm sm:w-64">
            <div className="text-xs font-medium text-slate-500">โอนเข้าบัญชี</div>
            <div className="mt-1 font-bold text-brand-dark">{bank.bankShortName}</div>
            <div className="text-xs text-slate-500">{bank.bankBranch}</div>
            <div className="mt-2 text-lg font-extrabold tracking-wide text-ink">
              {bank.accountNo}
            </div>
            <div className="text-xs text-slate-500">{bank.accountName}</div>
            {bank.promptpayId && (
              <div className="mt-1 text-xs text-slate-500">พร้อมเพย์: {bank.promptpayId}</div>
            )}
          </div>
          <div className="flex-1 text-sm text-slate-600">
            <p className="font-medium">วิธีจ่าย</p>
            <ol className="mt-1 list-decimal space-y-0.5 pl-5 text-xs">
              <li>เลือกแพ็กด้านล่าง</li>
              <li>โอนตามยอดเข้าบัญชีด้านซ้าย</li>
              <li>แนบสลิป แล้วกด &ldquo;ยืนยันการชำระ&rdquo;</li>
              <li>แอดมิน/ระบบตรวจยอด → ต่ออายุอัตโนมัติ</li>
            </ol>
          </div>
        </div>

        <div className="mt-4">
          <PackagePicker packages={pickerPackages} />
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <SlipUpload />
        </div>

        <SubmitButton className="btn-primary mt-4 w-full py-3" pendingText="กำลังส่งสลิป…">
          ยืนยันการชำระ (ส่งสลิป)
        </SubmitButton>
        <p className="mt-2 text-xs text-slate-400">
          ตรวจสลิปกับธนาคารอัตโนมัติเมื่อเชื่อม API (SlipOK/slip2go) — ระหว่างนี้แอดมินยืนยันมือได้
        </p>
      </form>

      {/* ประวัติการชำระเงิน + ใบเสร็จ + ส่งสลิปใหม่ */}
      {payments.length > 0 && (
        <div className="mt-6">
          <h2 className="mb-2 text-sm font-medium text-slate-500">ประวัติการชำระเงิน</h2>
          <div className="space-y-2">
            {payments.map((p) => {
              const st = PAY_STATUS[p.status];
              const pkg = pkgMap.get(p.packageId);
              const resubmit = resubmitSlipAction.bind(null, p.id);
              return (
                <div key={p.id} className="card p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium">
                        แพ็ก {pkg?.name ?? "-"} · {formatBahtExact(p.amount)}
                      </div>
                      <div className="text-xs text-slate-400">{timeAgo(p.createdAt)}</div>
                    </div>
                    <span className={`chip ${st.cls}`}>{st.label}</span>
                    {p.status === "verified" && (
                      <Link
                        href={`/sell/receipt/${p.id}`}
                        className="btn-outline px-3 py-1 text-xs"
                      >
                        🧾 ใบเสร็จ
                      </Link>
                    )}
                  </div>

                  {p.status === "rejected" && (
                    <form action={resubmit} className="mt-2 rounded-lg bg-red-50/60 p-3">
                      <p className="text-xs text-red-600">
                        เหตุผล: {p.note || "ยอด/สลิปไม่ตรง"} — แนบสลิปใหม่แล้วส่งอีกครั้ง
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <SlipUpload />
                        <SubmitButton className="btn-primary px-3 py-1.5 text-xs" pendingText="กำลังส่ง…">
                          ส่งสลิปใหม่
                        </SubmitButton>
                      </div>
                    </form>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
