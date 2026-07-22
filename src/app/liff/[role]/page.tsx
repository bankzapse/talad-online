import { notFound, redirect } from "next/navigation";
import LiffBridge from "@/components/LiffBridge";
import { isLiffRole, LIFF_HOME } from "@/lib/liff";
import { getCurrentSeller, isBuyerLoggedIn } from "@/lib/auth";
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

  return <LiffBridge liffId={liffId} role={role} next={next} />;
}
