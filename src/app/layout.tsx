import type { Metadata } from "next";
import { Noto_Sans_Thai } from "next/font/google";
import "./globals.css";
import Nav from "@/components/Nav";
import Link from "next/link";
import { COMPANY } from "@/lib/company";

const noto = Noto_Sans_Thai({
  subsets: ["thai", "latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-noto",
  display: "swap",
});

const SITE_URL = "https://talad-online.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "ตลาดออนไลน์ — ซื้อขายของสด + มือสอง จากตลาดใกล้คุณ",
    template: "%s · ตลาดออนไลน์",
  },
  description:
    "กระดานประกาศซื้อขายของสด ผัก ผลไม้ อาหารทะเล และสินค้ามือสองจากตลาดใกล้บ้าน นัดเจอจ่ายเงินสด แจ้งเตือนผ่าน LINE ทันที ค้นหาตามพื้นที่และเรียงราคาได้",
  keywords: [
    "ตลาดออนไลน์", "ของสด", "ผักสด", "ผลไม้", "อาหารทะเล", "สินค้ามือสอง",
    "ตลาดนัด", "ซื้อขายออนไลน์", "แม่ค้าออนไลน์", "ประกาศซื้อขาย",
  ],
  authors: [{ name: "ตลาดออนไลน์" }],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "th_TH",
    url: SITE_URL,
    siteName: "ตลาดออนไลน์",
    title: "ตลาดออนไลน์ — ซื้อขายของสด + มือสอง จากตลาดใกล้คุณ",
    description:
      "ของสด ผัก ผลไม้ อาหารทะเล และมือสองจากตลาดใกล้บ้าน นัดเจอจ่ายเงินสด แจ้งเตือนผ่าน LINE",
    images: [
      {
        url: "https://images.unsplash.com/photo-1542838132-92c53300491e?w=1200&h=630&fit=crop&q=80",
        width: 1200,
        height: 630,
        alt: "ตลาดสดของสด ผัก ผลไม้",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "ตลาดออนไลน์ — ของสด + มือสอง จากตลาดใกล้คุณ",
    description: "นัดเจอจ่ายเงินสด แจ้งเตือนผ่าน LINE ค้นหาตามพื้นที่ เรียงราคาได้",
    images: [
      "https://images.unsplash.com/photo-1542838132-92c53300491e?w=1200&h=630&fit=crop&q=80",
    ],
  },
  robots: { index: true, follow: true },
  category: "shopping",
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "ตลาดออนไลน์",
  url: SITE_URL,
  description: "กระดานประกาศซื้อขายของสดและสินค้ามือสองจากตลาดใกล้บ้าน",
  inLanguage: "th-TH",
  potentialAction: {
    "@type": "SearchAction",
    target: { "@type": "EntryPoint", urlTemplate: `${SITE_URL}/?q={query}` },
    "query-input": "required name=query",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th" className={noto.variable}>
      <body className="font-sans">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <Nav />
        <main className="mx-auto max-w-6xl px-4 py-6 sm:py-8">{children}</main>

        <footer className="mt-8 border-t border-slate-200/70 bg-white">
          <div className="mx-auto max-w-6xl px-4 py-10">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
              <div className="max-w-sm">
                <div className="flex items-center gap-2 text-lg font-extrabold text-brand-dark">
                  <span>🧺</span> ตลาดออนไลน์
                </div>
                <p className="mt-2 text-sm text-slate-500">
                  ตลาดออนไลน์เป็นเพียงตัวกลางประกาศ ไม่รับผิดชอบการซื้อขาย/คุณภาพสินค้า
                  ผู้ซื้อ–ผู้ขายนัดเจอจ่ายเงินสดกันเอง โปรดใช้วิจารณญาณ
                </p>
                <div className="mt-4 space-y-0.5 text-xs text-slate-400">
                  <div className="font-medium text-slate-500">{COMPANY.nameTh}</div>
                  <div>{COMPANY.nameEn}</div>
                  <div>เลขทะเบียน {COMPANY.regNo}</div>
                  <div>{COMPANY.address}</div>
                  <div>โทร {COMPANY.phones.join(" , ")}</div>
                </div>
              </div>
              <div className="flex gap-10 text-sm">
                <div>
                  <div className="mb-2 font-semibold text-slate-700">เมนู</div>
                  <ul className="space-y-1.5 text-slate-500">
                    <li><Link href="/" className="hover:text-brand-dark">หน้าแรก</Link></li>
                    <li><Link href="/login" className="hover:text-brand-dark">สำหรับผู้ขาย</Link></li>
                    <li><Link href="/help" className="hover:text-brand-dark">ช่วยเหลือ &amp; ติดต่อ</Link></li>
                  </ul>
                </div>
                <div>
                  <div className="mb-2 font-semibold text-slate-700">กฎหมาย</div>
                  <ul className="space-y-1.5 text-slate-500">
                    <li><Link href="/terms" className="hover:text-brand-dark">ข้อตกลงการใช้งาน</Link></li>
                    <li><Link href="/privacy" className="hover:text-brand-dark">นโยบายความเป็นส่วนตัว</Link></li>
                    <li><Link href="/my-data" className="hover:text-brand-dark">ข้อมูลส่วนบุคคลของฉัน</Link></li>
                  </ul>
                </div>
              </div>
            </div>
            <div className="mt-8 border-t border-slate-100 pt-5 text-center text-xs text-slate-400">
              © {new Date().getFullYear()} ตลาดออนไลน์ · สร้างเพื่อชุมชนตลาดใกล้บ้าน
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
