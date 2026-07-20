import Link from "next/link";
import type { Listing } from "@/lib/types";
import { DELIVERY_METHODS } from "@/lib/types";
import { formatPrice, timeAgo } from "@/lib/format";

export default function ListingCard({
  listing,
  emoji,
  categoryName,
  sellerVerified,
  companyVerified,
}: {
  listing: Listing;
  emoji: string;
  categoryName?: string;
  sellerVerified: boolean;
  companyVerified?: boolean;
}) {
  // ประกาศที่รับ "โอนก่อน" ได้ = ร้านผ่านการยืนยันตัวตนกับบริษัทแล้ว → ติดป้ายเชื่อถือได้
  const trusted =
    companyVerified &&
    (listing.deliveryMethod === "prepay" || listing.deliveryMethod === "shipping");
  return (
    <Link
      href={`/listing/${listing.id}`}
      className="card group overflow-hidden transition-all duration-200 hover:-translate-y-1 hover:shadow-lift"
    >
      <div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden bg-gradient-to-br from-brand-soft to-slate-50">
        {listing.images[0] ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={listing.images[0]}
            alt={listing.title}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
          />
        ) : (
          <span className="text-5xl opacity-80 transition group-hover:scale-110">{emoji}</span>
        )}
        {categoryName && (
          <span className="absolute left-2 top-2 chip border-white/60 bg-white/85 px-2 py-0.5 text-[11px] font-medium text-slate-600 backdrop-blur">
            {categoryName}
          </span>
        )}
        {trusted ? (
          <span className="absolute right-2 top-2 chip border-gold/50 bg-gold text-[10px] font-medium text-white shadow-soft">
            🛡️ เชื่อถือได้
          </span>
        ) : (
          sellerVerified && (
            <span className="absolute right-2 top-2 chip border-brand/30 bg-brand text-[10px] text-white">
              ✓ ยืนยันแล้ว
            </span>
          )
        )}
      </div>
      <div className="p-3">
        <div className="line-clamp-1 text-sm font-semibold text-ink">{listing.title}</div>
        <div className="mt-1 text-base font-extrabold text-brand-dark">
          {formatPrice(listing.price, listing.unit)}
        </div>
        <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
          <span className="line-clamp-1">📍 {listing.marketName || listing.province}</span>
          <span className="shrink-0">{timeAgo(listing.createdAt)}</span>
        </div>
        <div className="mt-1">
          <span
            className={`chip px-2 py-0.5 text-[10px] ${
              listing.deliveryMethod === "shipping"
                ? "border-amber-200 bg-amber-50 text-amber-600"
                : "border-brand/25 bg-brand-soft text-brand-dark"
            }`}
          >
            {DELIVERY_METHODS.find((d) => d.value === listing.deliveryMethod)?.short ?? "นัดรับ"}
          </span>
        </div>
      </div>
    </Link>
  );
}
