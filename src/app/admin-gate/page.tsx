import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import SubmitButton from "@/components/SubmitButton";
import { verifyAdminPassword } from "@/lib/admin-auth";
import { safeNext } from "@/lib/url";

export const dynamic = "force-dynamic";

async function enter(formData: FormData) {
  "use server";
  const pw = String(formData.get("key") || "");
  const next = safeNext(String(formData.get("next") || "/admin"), "/admin");

  // ตรวจรหัสจาก DB ก่อน (ตั้งได้ที่ /admin/settings) ไม่มีค่อย fallback ENV
  if (await verifyAdminPassword(pw)) {
    const jar = await cookies();
    // cookie เป็นแค่ session marker — middleware เทียบกับ ADMIN_KEY (edge-safe)
    jar.set("admin_ok", process.env.ADMIN_KEY ?? "", {
      httpOnly: true,
      path: "/",
      maxAge: 60 * 60 * 8,
      sameSite: "lax",
    });
    redirect(next);
  }
  redirect(`/admin-gate?error=1&next=${encodeURIComponent(next)}`);
}

export default async function AdminGate({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const sp = await searchParams;
  return (
    <div className="mx-auto max-w-sm">
      <div className="card p-6">
        <h1 className="text-lg font-bold">🔒 เข้าสู่ Admin</h1>
        <p className="mt-1 text-sm text-slate-500">กรอกรหัสผ่านผู้ดูแลระบบ</p>
        {sp.error && (
          <p className="mt-3 rounded-lg bg-red-50 p-2 text-center text-xs text-red-600">
            รหัสไม่ถูกต้อง
          </p>
        )}
        <form action={enter} className="mt-4 space-y-3">
          <input type="hidden" name="next" value={sp.next || "/admin"} />
          <input
            name="key"
            type="password"
            required
            className="input"
            placeholder="รหัสผ่าน admin"
            autoComplete="current-password"
          />
          <SubmitButton className="btn-primary w-full py-2" pendingText="กำลังเข้า…">
            เข้าสู่ระบบ
          </SubmitButton>
        </form>
        <p className="mt-3 text-center text-[11px] text-slate-400">
          เปลี่ยนรหัสได้ที่ admin → ตั้งค่าบัญชี (เก็บใน Supabase ไม่ต้อง redeploy)
        </p>
      </div>
    </div>
  );
}
