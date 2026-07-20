import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getListing, getSeller, isSellerActive, getLastBuyerInfo } from "@/lib/data";
import { getBuyerKey } from "@/lib/auth";
import { formatPrice, formatStock } from "@/lib/format";
import { createOrderAction } from "@/app/actions";
import SubmitButton from "@/components/SubmitButton";
import { DELIVERY_METHODS, needsShipping } from "@/lib/types";

export const dynamic = "force-dynamic";

const ERR: Record<string, string> = {
  name: "กรุณากรอกชื่อผู้รับ (อย่างน้อย 2 ตัวอักษร)",
  phone: "เบอร์ติดต่อไม่ถูกต้อง (มือถือ 10 หลัก)",
  address: "กรุณากรอกที่อยู่จัดส่งให้ครบถ้วน",
  qty: "จำนวนไม่ถูกต้อง",
  stock: "จำนวนที่สั่งเกินของที่ร้านมีอยู่",
  db: "สั่งซื้อไม่สำเร็จ ลองใหม่อีกครั้ง",
};

export default async function OrderPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;

  const listing = await getListing(id);
  if (!listing || listing.status !== "active") notFound();
  const seller = await getSeller(listing.sellerId);
  if (!seller || !isSellerActive(seller)) notFound();

  // ต้องล็อกอินก่อนสั่งซื้อ — ผูกออร์เดอร์กับตัวตน + กันสแปมร้าน
  const buyerKey = await getBuyerKey();
  if (!buyerKey) redirect(`/login?buyer=1&next=/listing/${id}/order`);

  const shipping = needsShipping(listing.deliveryMethod);
  const dm = DELIVERY_METHODS.find((d) => d.value === listing.deliveryMethod);
  const last = await getLastBuyerInfo(buyerKey!); // เติมที่อยู่เดิมให้ ไม่ต้องพิมพ์ซ้ำ
  const action = createOrderAction.bind(null, listing.id);

  return (
    <div className="mx-auto max-w-lg">
      <Link
        href={`/listing/${id}`}
        className="mb-4 inline-block text-sm text-slate-400 hover:text-slate-600"
      >
        ← กลับหน้าสินค้า
      </Link>

      <div className="card p-5">
        <h1 className="text-lg font-bold">สั่งซื้อสินค้า</h1>

        {/* สรุปสินค้า */}
        <div className="mt-3 flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/60 p-3">
          {listing.images[0] ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={listing.images[0]}
              alt=""
              className="h-14 w-14 shrink-0 rounded-lg object-cover"
            />
          ) : (
            <div className="h-14 w-14 shrink-0 rounded-lg bg-slate-100" />
          )}
          <div className="min-w-0">
            <div className="truncate text-sm font-medium text-ink">{listing.title}</div>
            <div className="text-sm text-brand-dark">
              {formatPrice(listing.price, listing.unit)}
            </div>
            <div className="text-xs text-slate-400">
              ร้าน {seller.shopName ?? seller.displayName} · {dm?.short}
              {listing.stock !== null && ` · ${formatStock(listing.stock, listing.unit)}`}
            </div>
          </div>
        </div>

        {sp.error && (
          <div className="mt-3 rounded-lg bg-red-50 p-2 text-center text-xs text-red-600">
            {ERR[sp.error] ?? "เกิดข้อผิดพลาด"}
          </div>
        )}

        <form action={action} className="mt-4 space-y-3">
          <div>
            <label className="label">ชื่อผู้รับ *</label>
            <input
              name="buyerName"
              required
              minLength={2}
              maxLength={80}
              defaultValue={last?.name ?? ""}
              className="input"
              placeholder="ชื่อ-นามสกุล"
            />
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <label className="label">เบอร์ติดต่อ *</label>
              <input
                name="buyerPhone"
                type="tel"
                required
                defaultValue={last?.phone ?? ""}
                className="input"
                placeholder="08xxxxxxxx"
              />
            </div>
            <div className="w-28">
              <label className="label">จำนวน *</label>
              <input
                name="qty"
                type="number"
                min="1"
                max={listing.stock ?? undefined}
                defaultValue={1}
                required
                className="input"
              />
            </div>
          </div>

          {/* นัดรับไม่ต้องกรอกที่อยู่ — ผู้ซื้อไปรับเองที่จุดนัด */}
          {shipping ? (
            <div>
              <label className="label">ที่อยู่จัดส่ง *</label>
              <textarea
                name="address"
                required
                rows={3}
                maxLength={500}
                defaultValue={last?.address ?? ""}
                className="input"
                placeholder="บ้านเลขที่ หมู่ ซอย ถนน ตำบล อำเภอ จังหวัด รหัสไปรษณีย์"
              />
              <p className="mt-1 text-xs text-slate-400">
                ร้านเห็นที่อยู่นี้เพื่อจัดส่งเท่านั้น
              </p>
            </div>
          ) : (
            <div className="rounded-lg border border-brand/25 bg-brand-soft p-3 text-sm text-brand-dark">
              🤝 วิธีรับของ: <b>นัดรับเอง</b> — ไม่ต้องกรอกที่อยู่
              <div className="mt-0.5 text-xs">
                จุดนัดรับ: {listing.marketName} · {listing.subdistrict} {listing.district}{" "}
                {listing.province}
              </div>
            </div>
          )}

          <div>
            <label className="label">ข้อความถึงร้าน</label>
            <textarea
              name="note"
              rows={2}
              maxLength={500}
              className="input"
              placeholder="เช่น ขอของสด ๆ / สะดวกรับวันเสาร์เช้า"
            />
          </div>

          <SubmitButton className="btn-primary w-full py-3" pendingText="กำลังส่งคำสั่งซื้อ…">
            ส่งคำสั่งซื้อ
          </SubmitButton>

          <p className="rounded-lg bg-slate-50 p-2 text-center text-xs text-slate-500">
            ส่งแล้วรอร้านยืนยัน — ยังไม่ต้องโอนเงินจนกว่าร้านจะยืนยันและตกลงรายละเอียดกัน
          </p>
        </form>
      </div>
    </div>
  );
}
