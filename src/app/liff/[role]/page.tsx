import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";
import Link from "next/link";
import Logo from "@/components/Logo";
import LiffBridge from "@/components/LiffBridge";
import { isLiffRole, LIFF_HOME } from "@/lib/liff";
import { getCurrentSeller, isBuyerLoggedIn } from "@/lib/auth";
import { isMobileUA } from "@/lib/line-login";
import { safeNext } from "@/lib/url";

export const dynamic = "force-dynamic";

// ปลายทางของ LIFF app — ตั้งใน LINE Developers เป็น
//   ผู้ขาย  → https://talad-online.vercel.app/liff/seller
//   ผู้ซื้อ  → https://talad-online.vercel.app/liff/buyer
//
// ต้องเป็นหน้าสาธารณะ (middleware ไม่คุม) ไม่งั้นจะโดนเด้งไป OAuth
// ตั้งแต่ยังไม่ทันได้ใช้ LIFF
export default async function LiffLanding({
  params,
  searchParams,
}: {
  params: Promise<{ role: string }>;
  searchParams: Promise<{ next?: string }>;
}) {
  const { role } = await params;
  if (!isLiffRole(role)) notFound();

  const sp = await searchParams;
  const next = safeNext(sp.next, LIFF_HOME[role]);

  // ล็อกอินอยู่แล้ว (cookie ยังไม่หมดอายุ) — ข้าม LIFF ไปเลย เร็วกว่า
  const already = role === "seller" ? Boolean(await getCurrentSeller()) : await isBuyerLoggedIn();
  if (already) redirect(next);

  const liffId =
    role === "seller"
      ? process.env.NEXT_PUBLIC_LIFF_ID_SELLER ?? ""
      : process.env.NEXT_PUBLIC_LIFF_ID_BUYER ?? "";

  const ua = (await headers()).get("user-agent");
  const inLineApp = /\bLine\/\d/i.test(ua ?? "");
  const onMobile = isMobileUA(ua);

  const oauth = `/api/auth/line?${role === "buyer" ? "buyer=1&" : ""}noliff=1&next=${encodeURIComponent(next)}`;

  // อยู่ในแอป LINE แล้ว → LIFF ขอ id_token ได้เลย ไม่ต้องถามอะไรผู้ใช้
  if (inLineApp && liffId) {
    return <LiffBridge liffId={liffId} role={role} next={next} />;
  }

  // คอมพิวเตอร์ → ไม่มีแอป LINE ให้เปิด ไปทาง OAuth (ซึ่งบังคับหน้าสแกน QR อยู่แล้ว)
  if (!onMobile || !liffId) redirect(oauth);

  // -------------------------------------------------------------------------
  // มือถือ แต่ยังอยู่นอกแอป LINE
  //
  // ต้องให้ "ผู้ใช้กดเอง" เท่านั้น — iOS/Android จะเปิดแอปจาก universal link
  // ก็ต่อเมื่อเป็นการแตะลิงก์จริง ๆ ถ้าเราสั่ง redirect ไป liff.line.me เอง
  // ระบบปฏิบัติการจะไม่เปิดแอปให้ ตกไปหน้าเว็บ LINE ที่ขออีเมล+รหัสผ่านแทน
  // (ยืนยันจากคลิปหน้าจอจริง: redirect → liff.line.me ขาว ๆ → access.line.me)
  // -------------------------------------------------------------------------
  const liffUrl = `https://liff.line.me/${liffId}?next=${encodeURIComponent(next)}`;

  return (
    <div className="mx-auto max-w-sm">
      <div className="card p-6 text-center">
        <div className="mx-auto w-fit">
          <Logo size={56} />
        </div>
        <h1 className="mt-4 text-lg font-bold text-ink">เข้าสู่ระบบด้วย LINE</h1>
        <p className="mt-1 text-sm text-slate-500">
          {role === "seller"
            ? "เปิดในแอป LINE แล้วเข้าได้เลย ไม่ต้องกรอกอะไร"
            : "เปิดในแอป LINE แล้วสั่งซื้อต่อได้เลย ไม่ต้องกรอกอะไร"}
        </p>

        {/* ต้องเป็น <a> ธรรมดา ไม่ใช่ next/link — ให้เป็นการแตะลิงก์จริงที่ OS มองเห็น */}
        <a href={liffUrl} className="btn-primary mt-6 w-full py-3.5 text-base">
          <span className="text-lg">💚</span> เปิดในแอป LINE
        </a>

        <p className="mt-4 text-xs text-slate-400">
          ยังไม่ได้ติดตั้งแอป LINE?{" "}
          <a href={oauth} className="underline hover:text-slate-600">
            เข้าด้วยเบราว์เซอร์แทน
          </a>
        </p>
      </div>

      <p className="mt-4 text-center text-sm text-slate-400">
        <Link href={next} className="hover:text-slate-600">
          ← ยังไม่เข้าสู่ระบบตอนนี้
        </Link>
      </p>
    </div>
  );
}
