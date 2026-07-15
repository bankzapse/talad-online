import { notFound } from "next/navigation";
import Link from "next/link";
import {
  getListing,
  getCategory,
  getArea,
  getSeller,
  getSellerActiveCount,
  isSellerActive,
} from "@/lib/data";
import { formatPrice, timeAgo } from "@/lib/format";
import { isBuyerLoggedIn } from "@/lib/auth";
import TrustBadge from "@/components/TrustBadge";
import ContactButton from "@/components/ContactButton";
import ReportButton from "@/components/ReportButton";

export const dynamic = "force-dynamic";

export default async function ListingDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const listing = await getListing(id);
  if (!listing || listing.status === "hidden") notFound();

  const [cat, area, seller, buyerLoggedIn] = await Promise.all([
    getCategory(listing.categoryId),
    getArea(listing.areaId),
    getSeller(listing.sellerId),
    isBuyerLoggedIn(),
  ]);
  // ซ่อนถ้าผู้ขายสมาชิกหมด/ถูกแบน (ประกาศไม่แสดงต่อผู้ซื้อ)
  if (!seller || !isSellerActive(seller)) notFound();
  const activeCount = await getSellerActiveCount(seller.id);

  const lineContact = `@${seller.displayName.replace(/\s/g, "").slice(0, 10)}`;

  return (
    <div>
      <Link href="/" className="mb-4 inline-block text-sm text-slate-400 hover:text-slate-600">
        ← กลับหน้าแรก
      </Link>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="card flex aspect-square items-center justify-center bg-gradient-to-br from-slate-100 to-slate-50 text-8xl">
          {listing.images[0] ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={listing.images[0]} alt={listing.title} className="h-full w-full rounded-xl object-cover" />
          ) : (
            <span>{cat?.emoji ?? "🛍️"}</span>
          )}
        </div>

        <div>
          <div className="flex items-start justify-between gap-2">
            <h1 className="text-xl font-bold text-slate-800">{listing.title}</h1>
            <ReportButton listingId={listing.id} />
          </div>

          <div className="mt-2 text-2xl font-bold text-brand-dark">
            {formatPrice(listing.price, listing.unit)}
          </div>

          <div className="mt-3 flex flex-wrap gap-1.5 text-xs">
            <span className="chip border-slate-200 bg-slate-50 text-slate-600">
              {cat?.emoji} {cat?.name}
            </span>
            <span className="chip border-slate-200 bg-slate-50 text-slate-600">
              📍 {area?.market} · {area?.province}
            </span>
            <span className="chip border-slate-200 bg-slate-50 text-slate-400">
              ลงเมื่อ {timeAgo(listing.createdAt)}
            </span>
          </div>

          <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-slate-600">
            {listing.description}
          </p>

          <div className="mt-5 card p-3">
            <div className="mb-2 text-sm font-medium text-slate-700">ผู้ขาย: {seller.displayName}</div>
            <TrustBadge seller={seller} activeCount={activeCount} />
          </div>

          <div className="mt-5">
            <ContactButton
              listingId={listing.id}
              buyerLoggedIn={buyerLoggedIn}
              lineContact={lineContact}
            />
            <p className="mt-2 text-center text-xs text-slate-400">
              นัดเจอจ่ายเงินสด · โปรดตรวจสอบสินค้าก่อนชำระ · ระวังการโอนเงินมัดจำล่วงหน้า
            </p>
          </div>

          {cat &&
            ["cat-veg", "cat-fruit", "cat-meat", "cat-seafood", "cat-cooked"].includes(cat.id) && (
              <p className="mt-3 rounded-lg bg-amber-50 p-2 text-center text-[11px] text-amber-600">
                ⚠️ สินค้าอาหาร: ผู้ขายเป็นผู้รับผิดชอบคุณภาพและความปลอดภัยอาหาร
              </p>
            )}
        </div>
      </div>
    </div>
  );
}
