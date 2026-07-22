import AdminNav from "@/components/AdminNav";
import { getPaymentSettings, getSystemSettings } from "@/lib/data";
import {
  savePaymentSettingsAction,
  saveAdminPasswordAction,
  saveSystemSettingsAction,
} from "@/app/actions";
import SubmitButton from "@/components/SubmitButton";

export const dynamic = "force-dynamic";

export default async function AdminSettings({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string; sys?: string }>;
}) {
  const sp = await searchParams;
  const s = await getPaymentSettings();
  const sys = await getSystemSettings();

  return (
    <div>
      <h1 className="mb-4 text-xl font-bold">ตั้งค่าระบบ</h1>
      <AdminNav active="settings" />

      {sp.sys === "1" && (
        <div className="mb-3 rounded-lg border border-brand/30 bg-brand-light p-3 text-sm text-brand-dark">
          ✓ บันทึกตั้งค่าระบบแล้ว
        </div>
      )}

      {/* ---- สวิตช์โหมดทดสอบ ---- */}
      <section className="mb-6 card max-w-lg p-5">
        <h2 className="font-bold text-ink">โหมดทดสอบ</h2>
        <p className="mt-1 text-xs text-slate-500">
          ปกติร้านสั่งซื้อประกาศของตัวเองไม่ได้ (กันปั่นยอด/ปั่นรีวิว)
          เปิดสวิตช์นี้เมื่อต้องการทดสอบวงจรสั่งซื้อด้วยบัญชี LINE เดียว
        </p>

        <form action={saveSystemSettingsAction} className="mt-4">
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              name="allowSelfPurchase"
              defaultChecked={sys.allowSelfPurchase}
              className="mt-1 h-4 w-4"
            />
            <span className="text-sm">
              <span className="font-medium text-slate-700">
                อนุญาตให้ร้านสั่งซื้อประกาศของตัวเอง
              </span>
              <span className="block text-xs text-slate-500">
                สำหรับทดสอบระบบเท่านั้น — ปิดกลับก่อนเปิดใช้จริง
              </span>
            </span>
          </label>

          {sys.allowSelfPurchase && (
            <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
              ⚠️ ตอนนี้เปิดโหมดทดสอบอยู่ — ร้านสั่งซื้อของตัวเองได้
              อย่าลืมปิดก่อนเปิดให้คนทั่วไปใช้
            </div>
          )}

          <SubmitButton className="btn-primary mt-4 px-4 py-2 text-sm" pendingText="กำลังบันทึก…">
            บันทึกตั้งค่าระบบ
          </SubmitButton>
        </form>
      </section>

      <h2 className="mb-3 text-lg font-bold">บัญชีรับเงิน</h2>

      {sp.saved === "pw" && (
        <div className="mb-3 rounded-lg border border-brand/30 bg-brand-light p-3 text-sm text-brand-dark">
          ✓ เปลี่ยนรหัส admin แล้ว — ครั้งต่อไปใช้รหัสใหม่เข้า /admin-gate
        </div>
      )}
      {sp.error === "pwshort" && (
        <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
          รหัสต้องยาวอย่างน้อย 8 ตัวอักษร
        </div>
      )}
      {sp.error === "pwmatch" && (
        <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
          รหัสยืนยันไม่ตรงกัน
        </div>
      )}
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

      <h2 className="mt-8 mb-2 text-sm font-medium text-slate-500">รหัสผ่าน Admin</h2>
      <form action={saveAdminPasswordAction} className="card max-w-lg space-y-3 p-5">
        <p className="text-xs text-slate-400">
          เก็บเป็น hash ใน Supabase (ตาราง settings) — เปลี่ยนได้ทันทีโดยไม่ต้อง redeploy
        </p>
        <div>
          <label className="label">รหัสใหม่ (อย่างน้อย 8 ตัว)</label>
          <input name="password" type="password" required minLength={8} className="input" autoComplete="new-password" />
        </div>
        <div>
          <label className="label">ยืนยันรหัสใหม่</label>
          <input name="confirm" type="password" required minLength={8} className="input" autoComplete="new-password" />
        </div>
        <SubmitButton className="btn-primary" pendingText="กำลังบันทึก…">เปลี่ยนรหัส</SubmitButton>
      </form>
    </div>
  );
}
