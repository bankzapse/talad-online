import Link from "next/link";
import Filters from "@/components/Filters";
import ListingCard from "@/components/ListingCard";
import CategorySidebar from "@/components/CategorySidebar";
import { getCategories, getAreas, getSellers, queryListings } from "@/lib/data";

export const dynamic = "force-dynamic";

const HERO_IMG =
  "https://images.unsplash.com/photo-1542838132-92c53300491e?w=1600&q=80";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ [k: string]: string | undefined }>;
}) {
  const sp = await searchParams;
  const [categories, areas, sellers, listings] = await Promise.all([
    getCategories(),
    getAreas(),
    getSellers(),
    queryListings({
      categoryId: sp.category || undefined,
      areaId: sp.area || undefined,
      q: sp.q || undefined,
      sort: (sp.sort as "newest" | "price_asc" | "price_desc") || "newest",
    }),
  ]);

  const catMap = new Map(categories.map((c) => [c.id, c]));
  const areaMap = new Map(areas.map((a) => [a.id, a]));
  const sellerMap = new Map(sellers.map((s) => [s.id, s]));
  const filtering = Boolean(sp.category || sp.area || sp.q);

  return (
    <div className="space-y-6">
      {/* ---------- HERO (คอมแพค — ดันสินค้าขึ้นมาให้เห็นเร็ว) ---------- */}
      <section className="relative overflow-hidden rounded-2xl shadow-soft">
        <div className="absolute inset-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={HERO_IMG} alt="ตลาดสด ผัก ผลไม้" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-brand-darker/95 via-brand-dark/85 to-brand-dark/55" />
        </div>

        <div className="relative flex flex-col gap-3 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-8 sm:py-6">
          <div className="min-w-0">
            <h1 className="text-lg font-extrabold leading-snug tracking-tight text-white sm:text-2xl">
              ของสด · มือสอง จากตลาดใกล้คุณ
            </h1>
            <p className="mt-1 text-xs text-white/85 sm:text-sm">
              นัดเจอจ่ายเงินสด · ผู้ขายได้แจ้งเตือนทาง LINE ทันที · กรองตามพื้นที่ เรียงราคาได้
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-white/75">
              <span><b className="text-white">{listings.length}</b> ประกาศ</span>
              <span>·</span>
              <span><b className="text-white">{areas.length}</b> ตลาด/พื้นที่</span>
              <span>·</span>
              <span><b className="text-white">{categories.length}</b> หมวด</span>
            </div>
          </div>
          <div className="flex shrink-0 gap-2">
            <a href="#listings" className="btn-gold px-4 py-2 text-sm">🛒 เลือกซื้อ</a>
            <Link href="/login" className="btn bg-white/95 px-4 py-2 text-sm text-brand-dark hover:bg-white">
              🏪 ลงขาย
            </Link>
          </div>
        </div>
      </section>

      {/* ---------- CATEGORY CHIPS (มือถือ) ---------- */}
      <section className="lg:hidden">
        <div className="flex flex-wrap gap-2">
          <Link
            href="/"
            className={`chip ${!sp.category ? "border-brand bg-brand text-white" : "border-slate-200 bg-white text-slate-600 hover:border-brand/40"}`}
          >
            ทั้งหมด
          </Link>
          {categories.map((c) => (
            <Link
              key={c.id}
              href={`/?category=${c.id}`}
              className={`chip ${sp.category === c.id ? "border-brand bg-brand text-white" : "border-slate-200 bg-white text-slate-600 hover:border-brand/40 hover:text-brand-dark"}`}
            >
              <span>{c.emoji}</span> {c.name}
            </Link>
          ))}
        </div>
      </section>

      {/* ---------- SIDEBAR + FILTERS + LISTINGS ---------- */}
      <section id="listings" className="scroll-mt-20">
        <div className="grid gap-6 lg:grid-cols-[236px_1fr]">
          <div className="hidden lg:block">
            <CategorySidebar categories={categories} activeId={sp.category} />
          </div>

          <div>
            <Filters categories={categories} areas={areas} />

            <div className="mb-4 flex items-baseline justify-between">
              <h2 className="section-title">
                {filtering
                  ? catMap.get(sp.category ?? "")?.name
                    ? `${catMap.get(sp.category!)!.emoji} ${catMap.get(sp.category!)!.name}`
                    : "ผลการค้นหา"
                  : "ประกาศล่าสุด"}
              </h2>
              <span className="text-sm text-slate-500">{listings.length} รายการ</span>
            </div>

            {listings.length === 0 ? (
              <div className="card grid place-items-center gap-2 p-14 text-center">
                <div className="text-4xl">🧺</div>
                <p className="font-medium text-slate-600">ยังไม่มีประกาศที่ตรงเงื่อนไข</p>
                <p className="text-sm text-slate-400">ลองปรับตัวกรอง หรือกลับมาดูใหม่เร็ว ๆ นี้</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
                {listings.map((l) => (
                  <ListingCard
                    key={l.id}
                    listing={l}
                    emoji={catMap.get(l.categoryId)?.emoji ?? "🛍️"}
                    areaMarket={areaMap.get(l.areaId)?.market ?? ""}
                    sellerVerified={Boolean(sellerMap.get(l.sellerId)?.phoneVerified)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ---------- HOW IT WORKS ---------- */}
      <section className="mt-4 rounded-3xl border border-slate-200/70 bg-white p-6 shadow-soft sm:p-10">
        <h2 className="section-title text-center">ซื้อขายง่ายใน 3 ขั้นตอน</h2>
        <div className="mt-8 grid gap-6 sm:grid-cols-3">
          <Step no="1" emoji="🔍" title="ค้นหาของถูกใจ" desc="กรองตามหมวดและพื้นที่ เรียงราคาต่ำ–สูง เห็นหน่วยชัด" />
          <Step no="2" emoji="💬" title="กดติดต่อผู้ขาย" desc="ระบบแจ้งเตือนเข้า LINE ผู้ขายทันที คุยรายละเอียดได้เลย" />
          <Step no="3" emoji="🤝" title="นัดเจอจ่ายสด" desc="นัดรับสินค้าและจ่ายเงินสดกันเอง ปลอดภัย ไม่ผ่านคนกลาง" />
        </div>
      </section>

      {/* ---------- SELLER CTA ---------- */}
      <section className="overflow-hidden rounded-3xl bg-gradient-to-r from-brand-dark to-brand-darker p-8 text-white shadow-lift sm:p-12">
        <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-extrabold">เป็นแม่ค้าตลาด? ลงขายฟรี 30 วัน</h2>
            <p className="mt-2 max-w-lg text-sm text-white/85">
              ลงประกาศผ่าน LINE ง่าย ๆ รับแจ้งเตือนเมื่อมีคนสนใจ ทดลองใช้ฟรีก่อน ไม่ต้องผูกบัตร
            </p>
          </div>
          <Link href="/login" className="btn-gold shrink-0 px-7 py-3 text-base">
            เริ่มลงขายเลย →
          </Link>
        </div>
      </section>
    </div>
  );
}

function Step({ no, emoji, title, desc }: { no: string; emoji: string; title: string; desc: string }) {
  return (
    <div className="relative rounded-2xl border border-slate-100 bg-brand-soft/40 p-6">
      <div className="absolute -top-3 left-6 grid h-7 w-7 place-items-center rounded-full bg-brand text-xs font-bold text-white shadow-soft">
        {no}
      </div>
      <div className="text-3xl">{emoji}</div>
      <h3 className="mt-3 font-bold text-ink">{title}</h3>
      <p className="mt-1 text-sm text-slate-500">{desc}</p>
    </div>
  );
}
