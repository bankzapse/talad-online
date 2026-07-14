import type { Seller } from "@/lib/types";
import { joinedLabel } from "@/lib/format";
import { getSellerListings } from "@/lib/data";

// สัญญาณความน่าเชื่อถือ (MVP — ยังไม่ต้องมีระบบรีวิวเต็ม)
export default function TrustBadge({ seller }: { seller: Seller }) {
  const count = getSellerListings(seller.id).filter(
    (l) => l.status === "active"
  ).length;
  return (
    <div className="flex flex-wrap items-center gap-1.5 text-xs">
      {seller.phoneVerified && (
        <span className="chip border-brand/30 bg-brand-light text-brand-dark">
          ✓ ยืนยันเบอร์แล้ว
        </span>
      )}
      <span className="chip border-slate-200 bg-slate-50 text-slate-500">
        เข้าร่วม {joinedLabel(seller.joinedAt)}
      </span>
      <span className="chip border-slate-200 bg-slate-50 text-slate-500">
        {count} ประกาศ
      </span>
    </div>
  );
}
