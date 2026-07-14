import Filters from "@/components/Filters";
import ListingCard from "@/components/ListingCard";
import { getCategories, getAreas, queryListings } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ [k: string]: string | undefined }>;
}) {
  const sp = await searchParams;
  const categories = getCategories();
  const areas = getAreas();
  const listings = queryListings({
    categoryId: sp.category || undefined,
    areaId: sp.area || undefined,
    q: sp.q || undefined,
    sort: (sp.sort as "newest" | "price_asc" | "price_desc") || "newest",
  });

  return (
    <div>
      <section className="mb-6 rounded-2xl bg-gradient-to-r from-brand to-brand-dark p-6 text-white">
        <h1 className="text-2xl font-bold">ของสด · มือสอง · จากตลาดใกล้คุณ</h1>
        <p className="mt-1 text-sm text-white/90">
          เจอของถูกใจ กด &ldquo;ติดต่อ&rdquo; แล้วนัดเจอจ่ายเงินสด — ผู้ขายได้แจ้งเตือนทาง LINE ทันที
        </p>
      </section>

      <Filters categories={categories} areas={areas} />

      <div className="mb-3 text-sm text-slate-500">
        พบ {listings.length} ประกาศ
      </div>

      {listings.length === 0 ? (
        <div className="card p-10 text-center text-slate-400">
          ไม่พบประกาศที่ตรงเงื่อนไข ลองปรับตัวกรอง
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {listings.map((l) => (
            <ListingCard key={l.id} listing={l} />
          ))}
        </div>
      )}
    </div>
  );
}
