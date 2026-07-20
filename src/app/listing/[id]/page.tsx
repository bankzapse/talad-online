import { notFound } from "next/navigation";
import Link from "next/link";
import {
  getListing,
  getCategory,
  getSeller,
  getSellerActiveCount,
  isSellerActive,
  getRelatedListings,
  getCategories,
  getSellers,
} from "@/lib/data";
import { formatPrice, formatStock, timeAgo } from "@/lib/format";
import { isBuyerLoggedIn, getCurrentSeller } from "@/lib/auth";
import TrustBadge from "@/components/TrustBadge";
import ContactButton from "@/components/ContactButton";
import ReportButton from "@/components/ReportButton";
import ListingCard from "@/components/ListingCard";
import Gallery from "@/components/Gallery";

export const dynamic = "force-dynamic";

export default async function ListingDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const listing = await getListing(id);
  // แสดงเฉพาะประกาศที่อนุมัติแล้ว — ร่าง/รอตรวจ/ถูกระงับ ต้องไม่เปิดดูได้ผ่าน URL ตรง
  // (ไม่งั้นแชร์ลิงก์ขายได้เลยโดยไม่ต้องผ่านการอนุมัติ)
  const viewer = await getCurrentSeller();
  const isOwner = viewer?.id === listing?.sellerId;
  if (!listing) notFound();
  if (listing.status !== "active" && listing.status !== "sold" && !isOwner) notFound();

  const [cat, seller, buyerLoggedIn] = await Promise.all([
    getCategory(listing.categoryId),
    getSeller(listing.sellerId),
    isBuyerLoggedIn(),
  ]);
  // ซ่อนถ้าผู้ขายสมาชิกหมด/ถูกแบน (ประกาศไม่แสดงต่อผู้ซื้อ)
  if (!seller || !isSellerActive(seller)) notFound();
  const activeCount = await getSellerActiveCount(seller.id);

  // สินค้าที่เกี่ยวข้อง — หมวดเดียวกัน/พื้นที่ใกล้กัน
  const [related, allCats, allSellers] = await Promise.all([
    getRelatedListings(listing, 6),
    getCategories(),
    getSellers(),
  ]);
  const relCat = new Map(allCats.map((c) => [c.id, c]));
  const relSeller = new Map(allSellers.map((s) => [s.id, s]));

  // ช่องทางติดต่อจริงที่ร้านกรอกไว้ — ห้ามเดา ID เอง ผู้ซื้อจะทักไม่ติด
  const lineContact =
    seller.lineId || (seller.contactPhone ? `โทร ${seller.contactPhone}` : "ผ่านปุ่มติดต่อในเว็บ");

  return (
    <div>
      <Link href="/" className="mb-4 inline-block text-sm text-slate-400 hover:text-slate-600">
        ← กลับหน้าแรก
      </Link>

      <div className="grid gap-6 md:grid-cols-2">
        <Gallery
          images={listing.images}
          alt={listing.title}
          fallback={cat?.emoji ?? "🛍️"}
        />

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
              📍 {listing.marketName} · {listing.subdistrict} {listing.district} {listing.province}
            </span>
            <span className="chip border-slate-200 bg-slate-50 text-slate-400">
              ลงเมื่อ {timeAgo(listing.createdAt)}
            </span>
            {listing.stock !== null && (
              <span
                className={`chip ${
                  listing.stock > 0
                    ? "border-brand/25 bg-brand-soft text-brand-dark"
                    : "border-red-200 bg-red-50 text-red-600"
                }`}
              >
                {listing.stock > 0 ? formatStock(listing.stock, listing.unit) : "ของหมด"}
              </span>
            )}
          </div>

          <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-slate-600">
            {listing.description}
          </p>

          <div className="mt-5 card p-3">
            <div className="mb-2 text-sm font-medium text-slate-700">ผู้ขาย: {seller.shopName ?? seller.displayName}</div>
            <TrustBadge seller={seller} activeCount={activeCount} />
          </div>

          {/* ความปลอดภัยตามวิธีรับของ */}
          {(() => {
            const kind =
              listing.deliveryMethod === "shipping"
                ? "risk"
                : listing.deliveryMethod === "prepay"
                ? "verified"
                : "safe";
            const cls =
              kind === "risk"
                ? "border-red-200 bg-red-50 text-red-700"
                : kind === "verified"
                ? "border-gold/40 bg-gold-light text-[#7a5c1f]"
                : "border-brand/30 bg-brand-soft text-brand-dark";
            return (
              <div className={`mt-5 rounded-xl border p-3 text-sm ${cls}`}>
                <div className="font-semibold">
                  {listing.deliveryMethod === "meetup" && "🤝 นัดรับเจอตัว · จ่ายเงินสด"}
                  {listing.deliveryMethod === "cod" && "📦 เก็บเงินปลายทาง (COD)"}
                  {listing.deliveryMethod === "prepay" && "🛡️ โอนก่อนรับสินค้า · ร้านยืนยันกับบริษัทแล้ว"}
                  {listing.deliveryMethod === "shipping" && "⚠️ ส่งพัสดุ · ต้องโอนก่อน"}
                </div>
                <p className="mt-0.5 text-xs">
                  {kind === "safe" &&
                    "ไม่ต้องโอนเงินล่วงหน้า — จ่ายตอนได้รับ/เห็นสินค้า ปลอดภัยกว่า"}
                  {kind === "verified" &&
                    "ร้านนี้ผ่านการยืนยันตัวตนกับบริษัทแล้ว หากมีปัญหาติดต่อทีมงานได้"}
                  {kind === "risk" &&
                    "เสี่ยงถูกโกง! ตรวจสอบผู้ขายให้มั่นใจก่อนโอน · อย่าโอนถ้าไม่แน่ใจ"}
                </p>
              </div>
            );
          })()}

          <div className="mt-3 space-y-2">
            {listing.stock !== null && listing.stock <= 0 ? (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-center text-sm text-slate-500">
                สินค้าหมดแล้ว — ทักถามร้านได้ว่าจะมีของเข้าอีกเมื่อไหร่
              </div>
            ) : (
              <Link
                href={`/listing/${listing.id}/order`}
                className="btn-primary w-full py-3 text-base"
              >
                🛒 สั่งซื้อสินค้านี้
              </Link>
            )}
            <ContactButton
              listingId={listing.id}
              buyerLoggedIn={buyerLoggedIn}
              lineContact={lineContact}
            />
            <p className="mt-2 rounded-lg bg-amber-50 p-2 text-center text-xs text-amber-700">
              🛡️ สินค้าอยู่ที่ <b>{listing.province}</b> — หากคุณอยู่คนละจังหวัด แนะนำเลือกผู้ขายที่รับ
              COD/นัดรับ · <b>ห้ามโอนมัดจำ/ค่าสินค้าล่วงหน้า</b> ให้คนไม่รู้จัก
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

      {/* ---------- สินค้าที่เกี่ยวข้อง ---------- */}
      {related.length > 0 && (
        <section className="mt-10">
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="section-title">สินค้าที่เกี่ยวข้อง</h2>
            <Link
              href={`/?category=${listing.categoryId}#listings`}
              className="text-sm text-brand-dark hover:underline"
            >
              ดูทั้งหมดในหมวดนี้ →
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
            {related.map((r) => (
              <ListingCard
                key={r.id}
                listing={r}
                emoji={relCat.get(r.categoryId)?.emoji ?? "🛍️"}
                categoryName={relCat.get(r.categoryId)?.name}
                sellerVerified={Boolean(relSeller.get(r.sellerId)?.phoneVerified)}
                companyVerified={Boolean(relSeller.get(r.sellerId)?.companyVerified)}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
