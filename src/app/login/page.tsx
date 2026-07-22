import Link from "next/link";
import { redirect } from "next/navigation";
import { getSellers } from "@/lib/data";
import { safeNext } from "@/lib/url";
import { loginAsSeller, loginAsBuyer, logout, logoutBuyer, logoutAdmin, logoutAll } from "@/app/actions";
import { isLineLoginConfigured } from "@/lib/line-login";
import { getCurrentSeller, isBuyerLoggedIn, isAdminLoggedIn } from "@/lib/auth";
import SubmitButton from "@/components/SubmitButton";

export const dynamic = "force-dynamic";

// error จาก LINE OAuth — บอกสาเหตุและวิธีแก้ ไม่ใช่แค่โยนรหัสให้ผู้ใช้เดา
const LOGIN_ERR: Record<string, { title: string; hint: string }> = {
  session: {
    title: "การเข้าสู่ระบบขาดช่วง",
    hint: "มักเกิดเมื่อเปิดลิงก์จากในแอป (LINE, Messenger, Facebook) แล้วเด้งไปเบราว์เซอร์อื่น — กดปุ่มด้านล่างลองใหม่ หรือเปิดเว็บนี้ในเบราว์เซอร์ (Safari/Chrome) แล้วค่อยเข้าสู่ระบบ",
  },
  cancelled: {
    title: "คุณยกเลิกการเข้าสู่ระบบ",
    hint: "ถ้าต้องการใช้งานต่อ กดเข้าสู่ระบบด้วย LINE อีกครั้ง",
  },
  state: {
    title: "ข้อมูลยืนยันไม่ตรงกัน",
    hint: "เพื่อความปลอดภัยระบบยกเลิกการเข้าสู่ระบบนี้ กรุณาลองใหม่อีกครั้ง",
  },
  token: { title: "เชื่อมต่อ LINE ไม่สำเร็จ", hint: "ลองใหม่อีกครั้ง หากยังไม่ได้ติดต่อทีมงาน" },
  profile: { title: "อ่านข้อมูลโปรไฟล์ไม่ได้", hint: "ลองใหม่อีกครั้ง หากยังไม่ได้ติดต่อทีมงาน" },
  oauth: { title: "เข้าสู่ระบบไม่สำเร็จ", hint: "ลองใหม่อีกครั้ง" },
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ buyer?: string; next?: string; error?: string }>;
}) {
  const sp = await searchParams;
  const isBuyer = sp.buyer === "1";
  const lineOn = isLineLoginConfigured();
  const next = sp.next || (isBuyer ? "/" : "/sell");

  // ---- สถานะการเข้าสู่ระบบตอนนี้ (ทุก role) ----
  const seller = await getCurrentSeller();
  const buyerIn = await isBuyerLoggedIn();
  const adminIn = await isAdminLoggedIn();
  const anyIn = Boolean(seller) || buyerIn || adminIn;

  // มี next = ถูกส่งมาล็อกอินก่อนไปทำอะไรสักอย่าง (เช่น กรอกคำสั่งซื้อ)
  // ถ้าล็อกอินบทบาทนั้นอยู่แล้ว พาไปปลายทางเลย — ไม่งั้นกลับจาก LINE มาแล้วเจอ
  // หน้าล็อกอินหน้าเดิมซ้ำ ดูเหมือนล็อกอินไม่ติดทั้งที่ติดแล้ว
  // (เข้า /login เปล่า ๆ ไม่เด้ง เพราะหน้านี้ทำหน้าที่หน้าบัญชี/ออกจากระบบด้วย)
  if (sp.next) {
    if (isBuyer && buyerIn) redirect(safeNext(sp.next));
    if (!isBuyer && seller) redirect(safeNext(sp.next));
  }

  const err = sp.error ? LOGIN_ERR[sp.error] ?? LOGIN_ERR.oauth : null;
  const roleCount = [Boolean(seller), buyerIn, adminIn].filter(Boolean).length;

  // แสดงเฉพาะ role ที่ล็อกอินอยู่จริง — ไม่ต้องโชว์บรรทัด "ยังไม่ได้เข้าสู่ระบบ" ให้รก
  // ปุ่ม "ออกจากระบบทั้งหมด" โผล่เมื่อล็อกอินหลาย role เท่านั้น (เครื่องที่ใช้ร่วมกัน)
  const statusCard = anyIn ? (
    <div className="card mb-4 p-4">
      <div className="text-xs font-medium uppercase tracking-wide text-slate-400">
        เข้าสู่ระบบอยู่
      </div>
      <ul className="mt-2 space-y-2 text-sm">
        {seller && (
          <li className="flex items-center justify-between gap-3">
            <span>🏪 ผู้ขาย — <b>{seller.shopName ?? seller.displayName}</b></span>
            <form action={logout}>
              <button className="text-xs text-slate-400 hover:text-red-600">ออกจากระบบ</button>
            </form>
          </li>
        )}
        {buyerIn && (
          <li className="flex items-center justify-between gap-3">
            <span>👤 ผู้ซื้อ</span>
            <form action={logoutBuyer}>
              <button className="text-xs text-slate-400 hover:text-red-600">ออกจากระบบ</button>
            </form>
          </li>
        )}
        {adminIn && (
          <li className="flex items-center justify-between gap-3">
            <span>🔒 แอดมิน</span>
            <form action={logoutAdmin}>
              <button className="text-xs text-slate-400 hover:text-red-600">ออกจากระบบ</button>
            </form>
          </li>
        )}
      </ul>
      {roleCount > 1 && (
        <form action={logoutAll} className="mt-3 border-t border-slate-100 pt-3">
          <SubmitButton className="btn-outline w-full py-1.5 text-xs" pendingText="กำลังออก…">
            ออกจากระบบทั้งหมด
          </SubmitButton>
        </form>
      )}
    </div>
  ) : null;

  // ---- ผู้ซื้อ ----
  if (isBuyer) {
    const lineHref = `/api/auth/line?buyer=1&next=${encodeURIComponent(next)}`;
    const doDemo = loginAsBuyer.bind(null, next);
    return (
      <div className="mx-auto max-w-md">
        {statusCard}
        <div className="card p-6 text-center">
          <span className="chip border-brand/25 bg-brand-soft text-brand-dark">
            👤 สำหรับผู้ซื้อ
          </span>
          <h1 className="mt-3 text-lg font-bold">เข้าสู่ระบบเพื่อสั่งซื้อ / ติดต่อผู้ขาย</h1>
          <p className="mt-1 text-sm text-slate-500">
            ต้องเข้าสู่ระบบก่อนกดติดต่อ เพื่อป้องกันการสแปมผู้ขาย
          </p>
          {err && (
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-left text-xs text-amber-800">
              <div className="font-medium">{err.title}</div>
              <p className="mt-1 leading-relaxed">{err.hint}</p>
            </div>
          )}
          {lineOn ? (
            <>
              <Link href={lineHref} className="btn-primary mt-5 w-full py-3">
                <span className="text-lg">💚</span> เข้าสู่ระบบด้วย LINE
              </Link>
              <EmailFallback href={`${lineHref}&email=1`} />
            </>
          ) : (
            <form action={doDemo} className="mt-5">
              <SubmitButton className="btn-primary w-full py-3" pendingText="กำลังเข้า…">
                <span className="text-lg">💚</span> เข้าสู่ระบบด้วย LINE
              </SubmitButton>
              <p className="mt-3 rounded-lg bg-amber-50 p-2 text-xs text-amber-700">
                ⚠️ โหมดทดลอง — คำสั่งซื้อจะผูกกับเบราว์เซอร์นี้เท่านั้น
                ถ้าออกจากระบบหรือล้างคุกกี้จะดูประวัติไม่ได้ และจะไม่ได้รับแจ้งเตือนทาง LINE
                <br />
                (เมื่อเปิดใช้ LINE Login จริง ประวัติจะผูกกับบัญชี LINE ถาวร)
              </p>
            </form>
          )}
        </div>
        <p className="mt-4 text-center text-sm text-slate-500">
          จะมาเปิดร้านขายของ?{" "}
          <Link href="/login" className="font-medium text-brand-dark underline">
            เข้าสู่ระบบสำหรับผู้ขาย
          </Link>
        </p>
      </div>
    );
  }

  // ---- ผู้ขาย ----
  const sellers = lineOn ? [] : await getSellers();
  const lineHref = `/api/auth/line?next=${encodeURIComponent(next)}`;

  return (
    <div className="mx-auto max-w-md">
      {statusCard}
      <div className="card p-6">
        <div className="text-center">
          <span className="chip border-brand/25 bg-brand-soft text-brand-dark">
            🏪 สำหรับผู้ขาย
          </span>
          <h1 className="mt-3 text-lg font-bold">เข้าสู่ระบบเพื่อลงขาย</h1>
          <p className="mt-1 text-sm text-slate-500">เข้าสู่ระบบด้วย LINE ไม่ต้องจำรหัสผ่าน</p>
        </div>

        {err && (
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-left text-xs text-amber-800">
            <div className="font-medium">{err.title}</div>
            <p className="mt-1 leading-relaxed">{err.hint}</p>
          </div>
        )}

        {lineOn ? (
          <>
            <Link href={lineHref} className="btn-primary mt-5 w-full py-3">
              <span className="text-lg">💚</span> เข้าสู่ระบบด้วย LINE
            </Link>
            <EmailFallback href={`${lineHref}&email=1`} />
          </>
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
      <p className="mt-4 text-center text-sm text-slate-500">
        มาซื้อของ?{" "}
        <Link href="/login?buyer=1" className="font-medium text-brand-dark underline">
          เข้าสู่ระบบสำหรับผู้ซื้อ
        </Link>
      </p>
    </div>
  );
}

// ทางออกสำรองบนคอมฯ — ปกติบังคับสแกน QR เพราะคนไทยส่วนใหญ่ไม่เคยตั้งอีเมล LINE
// แต่ต้องมีทางให้คนที่ไม่มีมือถืออยู่ในมือ ไม่งั้นเข้าระบบไม่ได้เลย
// ซ่อนบนมือถือ (sm:block) เพราะมือถือ LINE เปิดแอปให้อยู่แล้ว ไม่เจอหน้า QR
function EmailFallback({ href }: { href: string }) {
  return (
    <p className="mt-3 hidden text-center text-xs text-slate-400 sm:block">
      ไม่มีมือถืออยู่กับตัว?{" "}
      <a href={href} className="underline hover:text-slate-600">
        เข้าด้วยอีเมล LINE แทน
      </a>
    </p>
  );
}
