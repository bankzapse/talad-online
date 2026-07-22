import { signInUrl } from "@/lib/url";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentSeller } from "@/lib/auth";
import { verifyPhoneAction } from "@/app/actions";
import { isOtpConfigured } from "@/lib/otp";
import SubmitButton from "@/components/SubmitButton";

export const dynamic = "force-dynamic";

const ERR: Record<string, string> = {
  invalid: "เบอร์ไม่ถูกต้อง (ต้องเป็นมือถือ 10 หลัก)",
  taken: "เบอร์นี้ถูกใช้ยืนยันกับอีกบัญชีแล้ว (1 เบอร์ = 1 บัญชี)",
  code: "รหัส OTP ไม่ถูกต้อง",
  db: "บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง",
};

export default async function VerifyPhone({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const seller = await getCurrentSeller();
  if (!seller) redirect(signInUrl({ next: "/sell/verify-phone" }));
  const sp = await searchParams;
  const otpOn = isOtpConfigured();

  return (
    <div className="mx-auto max-w-md">
      <Link href="/sell" className="text-sm text-slate-400 hover:text-slate-600">← กลับร้านของฉัน</Link>
      <div className="mt-4 card p-6">
        <div className="text-center">
          <div className="text-4xl">📱</div>
          <h1 className="mt-2 text-lg font-bold">ยืนยันเบอร์โทร</h1>
          <p className="mt-1 text-sm text-slate-500">
            รับป้าย &ldquo;✓ ยืนยันเบอร์แล้ว&rdquo; เพิ่มความน่าเชื่อถือให้ร้านคุณ · 1 เบอร์ = 1 บัญชี
          </p>
        </div>

        {sp.error && (
          <div className="mt-4 rounded-lg bg-red-50 p-2 text-center text-xs text-red-600">
            {ERR[sp.error] ?? "เกิดข้อผิดพลาด"}
          </div>
        )}

        <form action={verifyPhoneAction} className="mt-5 space-y-3">
          <div>
            <label className="label">เบอร์มือถือ</label>
            <input
              name="phone"
              type="tel"
              required
              defaultValue={seller.phone ?? ""}
              className="input"
              placeholder="08xxxxxxxx"
            />
          </div>
          {otpOn && (
            <div>
              <label className="label">รหัส OTP (ส่งไปที่เบอร์)</label>
              <input name="code" inputMode="numeric" className="input" placeholder="รหัส 6 หลัก" />
            </div>
          )}
          <SubmitButton className="btn-primary w-full py-2.5" pendingText="กำลังยืนยัน…">
            ยืนยันเบอร์
          </SubmitButton>
        </form>

        {!otpOn && (
          <p className="mt-3 rounded-lg bg-slate-50 p-2 text-center text-[11px] text-slate-400">
            โหมด dev: ยังไม่ได้เชื่อม SMS OTP — ยืนยันเบอร์แบบไม่มีรหัสไปก่อน
            (เชื่อม provider เพื่อส่ง OTP จริง ป้องกันการสวมเบอร์)
          </p>
        )}
      </div>
    </div>
  );
}
