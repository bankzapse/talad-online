import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

async function enter(formData: FormData) {
  "use server";
  const key = String(formData.get("key") || "");
  const next = String(formData.get("next") || "/admin");
  if (process.env.ADMIN_KEY && key === process.env.ADMIN_KEY) {
    const jar = await cookies();
    jar.set("admin_ok", key, {
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
        <p className="mt-1 text-sm text-slate-500">กรอกรหัส admin เพื่อเข้าใช้งาน</p>
        {sp.error && (
          <p className="mt-3 rounded-lg bg-red-50 p-2 text-center text-xs text-red-600">
            รหัสไม่ถูกต้อง
          </p>
        )}
        <form action={enter} className="mt-4 space-y-3">
          <input type="hidden" name="next" value={sp.next || "/admin"} />
          <input name="key" type="password" required className="input" placeholder="ADMIN_KEY" />
          <button className="btn-primary w-full py-2">เข้าสู่ระบบ</button>
        </form>
      </div>
    </div>
  );
}
