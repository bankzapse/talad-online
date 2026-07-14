import Link from "next/link";
import type { Listing } from "@/lib/types";
import { formatPrice, timeAgo } from "@/lib/format";

export default function ListingCard({
  listing,
  emoji,
  areaMarket,
  sellerVerified,
}: {
  listing: Listing;
  emoji: string;
  areaMarket: string;
  sellerVerified: boolean;
}) {
  return (
    <Link
      href={`/listing/${listing.id}`}
      className="card group overflow-hidden transition hover:shadow-md"
    >
      <div className="flex aspect-[4/3] items-center justify-center bg-gradient-to-br from-slate-100 to-slate-50 text-5xl">
        {listing.images[0] ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={listing.images[0]} alt={listing.title} className="h-full w-full object-cover" />
        ) : (
          <span>{emoji}</span>
        )}
      </div>
      <div className="p-3">
        <div className="line-clamp-1 text-sm font-medium text-slate-800">{listing.title}</div>
        <div className="mt-1 font-bold text-brand-dark">
          {formatPrice(listing.price, listing.unit)}
        </div>
        <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
          <span className="line-clamp-1">📍 {areaMarket}</span>
          <span className="shrink-0">{timeAgo(listing.createdAt)}</span>
        </div>
        {sellerVerified && <div className="mt-1 text-[11px] text-brand">✓ ผู้ขายยืนยันเบอร์</div>}
      </div>
    </Link>
  );
}
