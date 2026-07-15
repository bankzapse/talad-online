import type { Metadata } from "next";
import "./globals.css";
import Nav from "@/components/Nav";

export const metadata: Metadata = {
  title: "ตลาดออนไลน์ — ซื้อขายของสด + มือสอง",
  description:
    "กระดานประกาศซื้อขายของสดและสินค้ามือสองในตลาด นัดเจอจ่ายเงินสด แจ้งเตือนผ่าน LINE",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="th">
      <body>
        <Nav />
        <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
        <footer className="mx-auto max-w-5xl px-4 py-10 text-center text-xs text-slate-400">
          <p>
            ตลาดออนไลน์เป็นเพียงตัวกลางประกาศ ไม่รับผิดชอบการซื้อขาย/คุณภาพสินค้า ·
            ผู้ซื้อ–ผู้ขายนัดเจอจ่ายเงินสดกันเอง โปรดใช้วิจารณญาณ
          </p>
          <p className="mt-2 space-x-3">
            <a href="/terms" className="underline hover:text-slate-600">ข้อตกลงการใช้งาน</a>
            <a href="/privacy" className="underline hover:text-slate-600">นโยบายความเป็นส่วนตัว (PDPA)</a>
          </p>
        </footer>
      </body>
    </html>
  );
}
