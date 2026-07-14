import { getSellers } from "@/lib/data";
import { loginAsSeller, loginAsBuyer } from "@/app/actions";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ buyer?: string; next?: string }>;
}) {
  const sp = await searchParams;
  const isBuyer = sp.buyer === "1";
  const sellers = getSellers();

  if (isBuyer) {
    const doLogin = loginAsBuyer.bind(null, sp.next);
    return (
      <div className="mx-auto max-w-md">
        <div className="card p-6 text-center">
          <div className="text-4xl">💬</div>
          <h1 className="mt-2 text-lg font-bold">เข้าสู่ระบบเพื่อติดต่อผู้ขาย</h1>
          <p className="mt-1 text-sm text-slate-500">
            ต้องเข้าสู่ระบบก่อนกดติดต่อ เพื่อป้องกันการสแปมผู้ขาย
          </p>
          <form action={doLogin} className="mt-5">
            <button className="btn-primary w-full py-3">
              <span className="text-lg">💚</span> เข้าสู่ระบบด้วย LINE
            </button>
          </form>
          <p className="mt-3 text-xs text-slate-400">
            (โหมด demo — ต่อ LINE Login จริงตาม README)
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md">
      <div className="card p-6">
        <div className="text-center">
          <div className="text-4xl">🏪</div>
          <h1 className="mt-2 text-lg font-bold">ผู้ขาย — เข้าสู่ระบบ</h1>
          <p className="mt-1 text-sm text-slate-500">
            เข้าสู่ระบบด้วย LINE ไม่ต้องจำรหัสผ่าน
          </p>
        </div>

        <div className="mt-5 space-y-2">
          <p className="text-xs font-medium text-slate-400">
            เลือกบัญชีตัวอย่าง (demo LINE Login):
          </p>
          {sellers.map((s) => {
            const doLogin = loginAsSeller.bind(null, s.id, "/sell");
            return (
              <form key={s.id} action={doLogin}>
                <button className="btn-outline w-full justify-between">
                  <span>{s.displayName}</span>
                  <span className="text-xs text-slate-400">
                    {s.trialUsed ? "มีสมาชิก" : "ยังไม่เริ่มทดลอง"}
                  </span>
                </button>
              </form>
            );
          })}
        </div>

        <p className="mt-4 rounded-lg bg-slate-50 p-3 text-xs text-slate-500">
          การสมัครจริงจะบังคับ <b>ยืนยันเบอร์โทรด้วย OTP</b> (1 เบอร์ = 1 สิทธิ์ทดลองฟรี) และ
          &ldquo;เพิ่มเพื่อน&rdquo; LINE OA เพื่อรับแจ้งเตือน
        </p>
      </div>
    </div>
  );
}
