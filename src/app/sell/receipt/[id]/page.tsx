import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentSeller } from "@/lib/auth";
import { getPayment, getPackages, getPaymentSettings } from "@/lib/data";
import { formatBahtExact } from "@/lib/format";
import { COMPANY } from "@/lib/company";
import PrintButton from "@/components/PrintButton";

export const dynamic = "force-dynamic";

function receiptNo(id: string, iso: string | null) {
  const d = iso ? new Date(iso) : new Date();
  const ym = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}`;
  return `RC-${ym}-${id.replace(/[^a-zA-Z0-9]/g, "").slice(-6).toUpperCase()}`;
}

export default async function ReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  const seller = await getCurrentSeller();
  if (!seller) redirect("/login");
  const { id } = await params;
  const pay = await getPayment(id);
  // เจ้าของเท่านั้น + ต้องยืนยันแล้วถึงออกใบเสร็จ
  if (!pay || pay.sellerId !== seller.id) notFound();
  if (pay.status !== "verified") redirect("/sell/membership");

  const [pkgs, bank] = await Promise.all([getPackages(), getPaymentSettings()]);
  const pkg = pkgs.find((p) => p.id === pay.packageId);
  const date = pay.verifiedAt ? new Date(pay.verifiedAt) : new Date(pay.createdAt);

  return (
    <div className="mx-auto max-w-lg">
      <div className="mb-4 flex items-center justify-between print:hidden">
        <Link href="/sell/membership" className="text-sm text-slate-400 hover:text-slate-600">
          ← กลับ
        </Link>
        <PrintButton />
      </div>

      <div className="card p-8">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 text-lg font-extrabold text-brand-dark">
              🧺 ตลาดออนไลน์
            </div>
            <div className="mt-1 text-xs text-slate-500">
              <div>{COMPANY.nameTh}</div>
              <div>เลขทะเบียน {COMPANY.regNo}</div>
              <div className="max-w-xs">{COMPANY.address}</div>
              <div>โทร {COMPANY.phones.join(" , ")}</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-lg font-bold">ใบเสร็จรับเงิน</div>
            <div className="text-xs text-amber-600">(ชั่วคราว)</div>
          </div>
        </div>

        <div className="mt-6 flex justify-between border-y border-slate-100 py-3 text-sm">
          <div>
            <div className="text-xs text-slate-400">เลขที่</div>
            <div className="font-semibold">{receiptNo(pay.id, pay.verifiedAt)}</div>
          </div>
          <div className="text-right">
            <div className="text-xs text-slate-400">วันที่</div>
            <div className="font-semibold">
              {date.toLocaleDateString("th-TH", { day: "numeric", month: "long", year: "numeric" })}
            </div>
          </div>
        </div>

        <div className="mt-4 text-sm">
          <div className="text-xs text-slate-400">ได้รับเงินจาก</div>
          <div className="font-semibold">{seller.displayName}</div>
        </div>

        <table className="mt-5 w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs text-slate-400">
              <th className="pb-2">รายการ</th>
              <th className="pb-2 text-right">จำนวนเงิน</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-slate-100">
              <td className="py-3">
                ค่าสมาชิกผู้ขาย — แพ็ก {pkg?.name ?? "-"}
                {pkg ? ` (${pkg.days} วัน)` : ""}
              </td>
              <td className="py-3 text-right">{formatBahtExact(pay.amount)}</td>
            </tr>
          </tbody>
          <tfoot>
            <tr>
              <td className="pt-3 text-right font-bold">รวมทั้งสิ้น</td>
              <td className="pt-3 text-right text-lg font-extrabold text-brand-dark">
                {formatBahtExact(pay.amount)}
              </td>
            </tr>
          </tfoot>
        </table>

        <div className="mt-6 rounded-lg bg-slate-50 p-3 text-xs text-slate-500">
          ชำระโดยการโอนเข้าบัญชี {bank.bankShortName} {bank.accountNo} · สถานะ: ยืนยันแล้ว ✓
        </div>

        <p className="mt-4 text-center text-[11px] text-slate-400">
          * เอกสารนี้เป็นใบเสร็จรับเงินชั่วคราว มิใช่ใบกำกับภาษี
        </p>
      </div>
    </div>
  );
}
