import AdminNav from "@/components/AdminNav";
import { getPaymentSettings } from "@/lib/data";
import { savePaymentSettingsAction } from "@/app/actions";
import SubmitButton from "@/components/SubmitButton";

export const dynamic = "force-dynamic";

export default async function AdminSettings({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  const sp = await searchParams;
  const s = await getPaymentSettings();

  return (
    <div>
      <h1 className="mb-4 text-xl font-bold">ตั้งค่าบัญชีรับเงิน</h1>
      <AdminNav active="settings" />

      {sp.saved === "1" && (
        <div className="mb-3 rounded-lg border border-brand/30 bg-brand-light p-3 text-sm text-brand-dark">
          ✓ บันทึกแล้ว — ผู้ขายจะเห็นบัญชีใหม่ในหน้าชำระเงินทันที
        </div>
      )}
      {sp.error === "migrate" && (
        <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
          ยังบันทึกไม่ได้ — ต้องรัน <code>supabase/schema.sql</code> ล่าสุดใน Supabase ก่อน (เพิ่มตาราง
          <code> settings</code>) แล้วลองใหม่ · ระหว่างนี้ระบบใช้บัญชีค่าเริ่มต้นจากข้อมูลบริษัท
        </div>
      )}

      <form action={savePaymentSettingsAction} className="card max-w-lg space-y-3 p-5">
        <p className="text-xs text-slate-400">
          บัญชีที่ผู้ขายโอนค่าสมาชิกเข้ามา — แก้แล้วมีผลทั้งหน้าชำระเงินและใบเสร็จ
        </p>
        <div>
          <label className="label">ธนาคาร</label>
          <input name="bankShortName" defaultValue={s.bankShortName} className="input" />
        </div>
        <div>
          <label className="label">สาขา</label>
          <input name="bankBranch" defaultValue={s.bankBranch} className="input" />
        </div>
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="label">เลขที่บัญชี</label>
            <input name="accountNo" defaultValue={s.accountNo} className="input" />
          </div>
          <div className="flex-1">
            <label className="label">PromptPay ID (ถ้ามี)</label>
            <input
              name="promptpayId"
              defaultValue={s.promptpayId}
              className="input"
              placeholder="เบอร์/เลขบัตร"
            />
          </div>
        </div>
        <div>
          <label className="label">ชื่อบัญชี</label>
          <input name="accountName" defaultValue={s.accountName} className="input" />
        </div>
        <SubmitButton className="btn-primary" pendingText="กำลังบันทึก…">บันทึก</SubmitButton>
      </form>
    </div>
  );
}
