import Link from "next/link";
import { getSellers } from "@/lib/data";
import { loginAsSeller, loginAsBuyer } from "@/app/actions";
import { isLineLoginConfigured } from "@/lib/line-login";
import SubmitButton from "@/components/SubmitButton";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ buyer?: string; next?: string; error?: string }>;
}) {
  const sp = await searchParams;
  const isBuyer = sp.buyer === "1";
  const lineOn = isLineLoginConfigured();
  const next = sp.next || (isBuyer ? "/" : "/sell");

  // ---- ผู้ซื้อ ----
  if (isBuyer) {
    const lineHref = `/api/auth/line?buyer=1&next=${encodeURIComponent(next)}`;
    const doDemo = loginAsBuyer.bind(null, next);
    return (
      <div className="mx-auto max-w-md">
        <div className="card p-6 text-center">
          <div className="text-4xl">💬</div>
          <h1 className="mt-2 text-lg font-bold">เข้าสู่ระบบเพื่อติดต่อผู้ขาย</h1>
          <p className="mt-1 text-sm text-slate-500">
            ต้องเข้าสู่ระบบก่อนกดติดต่อ เพื่อป้องกันการสแปมผู้ขาย
          </p>
          {lineOn ? (
            <Link href={lineHref} className="btn-primary mt-5 w-full py-3">
              <span className="text-lg">💚</span> เข้าสู่ระบบด้วย LINE
            </Link>
          ) : (
            <form action={doDemo} className="mt-5">
              <SubmitButton className="btn-primary w-full py-3" pendingText="กำลังเข้า…">
                <span className="text-lg">💚</span> เข้าสู่ระบบด้วย LINE
              </SubmitButton>
              <p className="mt-3 text-xs text-slate-400">(โหมด demo — ตั้งค่า LINE Login เพื่อใช้จริง)</p>
            </form>
          )}
        </div>
      </div>
    );
  }

  // ---- ผู้ขาย ----
  const sellers = lineOn ? [] : await getSellers();
  const lineHref = `/api/auth/line?next=${encodeURIComponent(next)}`;

  return (
    <div className="mx-auto max-w-md">
      <div className="card p-6">
        <div className="text-center">
          <div className="text-4xl">🏪</div>
          <h1 className="mt-2 text-lg font-bold">ผู้ขาย — เข้าสู่ระบบ</h1>
          <p className="mt-1 text-sm text-slate-500">เข้าสู่ระบบด้วย LINE ไม่ต้องจำรหัสผ่าน</p>
        </div>

        {sp.error && (
          <p className="mt-4 rounded-lg bg-red-50 p-2 text-center text-xs text-red-600">
            เข้าสู่ระบบไม่สำเร็จ ({sp.error}) ลองใหม่อีกครั้ง
          </p>
        )}

        {lineOn ? (
          <Link href={lineHref} className="btn-primary mt-5 w-full py-3">
            <span className="text-lg">💚</span> เข้าสู่ระบบด้วย LINE
          </Link>
        ) : (
          <div className="mt-5 space-y-2">
            <p className="text-xs font-medium text-slate-400">
              เลือกบัญชีตัวอย่าง (demo LINE Login):
            </p>
            {sellers.map((s) => {
              const doLogin = loginAsSeller.bind(null, s.id, "/sell");
              return (
                <form key={s.id} action={doLogin}>
                  <SubmitButton className="btn-outline w-full justify-between">
                    <span>{s.displayName}</span>
                    <span className="text-xs text-slate-400">
                      {s.trialUsed ? "มีสมาชิก" : "ยังไม่เริ่มทดลอง"}
                    </span>
                  </SubmitButton>
                </form>
              );
            })}
          </div>
        )}

        <p className="mt-4 rounded-lg bg-slate-50 p-3 text-xs text-slate-500">
          การสมัครจริงจะบังคับ <b>ยืนยันเบอร์โทรด้วย OTP</b> (1 เบอร์ = 1 สิทธิ์ทดลองฟรี) และ
          &ldquo;เพิ่มเพื่อน&rdquo; LINE OA เพื่อรับแจ้งเตือน
        </p>
        <p className="mt-2 text-center text-[11px] text-slate-400">
          การเข้าสู่ระบบถือว่ายอมรับ{" "}
          <a href="/terms" className="underline">ข้อตกลงการใช้งาน</a> และ{" "}
          <a href="/privacy" className="underline">นโยบายความเป็นส่วนตัว</a>
        </p>
      </div>
    </div>
  );
}
