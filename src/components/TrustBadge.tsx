import type { Seller } from "@/lib/types";
import { joinedLabel } from "@/lib/format";

// สัญญาณความน่าเชื่อถือ (MVP — ยังไม่ต้องมีระบบรีวิวเต็ม)
export default function TrustBadge({
  seller,
  activeCount,
}: {
  seller: Seller;
  activeCount: number;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5 text-xs">
      {seller.companyVerified && (
        <span className="chip border-gold/50 bg-gold-light font-medium text-[#7a5c1f]">
          🛡️ ร้านเชื่อถือได้ — ยืนยันกับบริษัทแล้ว
        </span>
      )}
      {seller.phoneVerified && (
        <span className="chip border-brand/30 bg-brand-light text-brand-dark">
          ✓ ยืนยันเบอร์แล้ว
        </span>
      )}
      <span className="chip border-slate-200 bg-slate-50 text-slate-500">
        เข้าร่วม {joinedLabel(seller.joinedAt)}
      </span>
      <span className="chip border-slate-200 bg-slate-50 text-slate-500">
        {activeCount} ประกาศ
      </span>
    </div>
  );
}
