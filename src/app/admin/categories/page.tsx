import AdminNav from "@/components/AdminNav";
import { getCategories, categoryListingCount } from "@/lib/data";
import {
  createCategoryAction,
  updateCategoryAction,
  deleteCategoryAction,
  moveCategoryAction,
} from "@/app/actions";
import SubmitButton from "@/components/SubmitButton";

export const dynamic = "force-dynamic";

export default async function AdminCategories({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const sp = await searchParams;
  const categories = await getCategories();
  const counts = new Map(
    await Promise.all(
      categories.map(async (c) => [c.id, await categoryListingCount(c.id)] as const)
    )
  );

  return (
    <div>
      <h1 className="mb-4 text-xl font-bold">จัดการประเภทสินค้า</h1>
      <AdminNav active="categories" />

      {sp.error === "inuse" && (
        <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
          ลบไม่ได้ — ยังมีประกาศใช้หมวดนี้อยู่ (ย้ายประกาศไปหมวดอื่นก่อน)
        </div>
      )}

      {/* เพิ่มหมวดใหม่ */}
      <form
        action={createCategoryAction}
        className="card mb-5 flex flex-wrap items-end gap-3 p-4"
      >
        <div className="w-20">
          <label className="label">ไอคอน</label>
          <input name="emoji" className="input text-center text-lg" placeholder="🥬" maxLength={4} />
        </div>
        <div className="flex-1">
          <label className="label">ชื่อหมวดใหม่</label>
          <input name="name" required className="input" placeholder="เช่น เครื่องแกง, ผลไม้ตามฤดู" />
        </div>
        <SubmitButton className="btn-primary" pendingText="กำลังเพิ่ม…">+ เพิ่มหมวด</SubmitButton>
      </form>

      {/* รายการหมวด */}
      <div className="space-y-2">
        {categories.map((c, i) => {
          const used = counts.get(c.id) ?? 0;
          const save = updateCategoryAction.bind(null, c.id);
          const del = deleteCategoryAction.bind(null, c.id);
          const up = moveCategoryAction.bind(null, c.id, -1);
          const down = moveCategoryAction.bind(null, c.id, 1);
          return (
            <div key={c.id} className="card flex flex-wrap items-center gap-3 p-3">
              {/* จัดเรียงลำดับ — ลำดับนี้คือลำดับที่ผู้ซื้อเห็นในเมนูหมวดสินค้า */}
              <div className="flex flex-col">
                <form action={up}>
                  <button
                    disabled={i === 0}
                    aria-label={`เลื่อน ${c.name} ขึ้น`}
                    className="px-1.5 text-slate-400 hover:text-brand-dark disabled:opacity-25"
                  >
                    ▲
                  </button>
                </form>
                <form action={down}>
                  <button
                    disabled={i === categories.length - 1}
                    aria-label={`เลื่อน ${c.name} ลง`}
                    className="px-1.5 text-slate-400 hover:text-brand-dark disabled:opacity-25"
                  >
                    ▼
                  </button>
                </form>
              </div>
              <span className="w-5 shrink-0 text-center text-xs text-slate-300">{i + 1}</span>

              <form action={save} className="flex flex-1 flex-wrap items-center gap-2">
                <input
                  name="emoji"
                  defaultValue={c.emoji}
                  maxLength={4}
                  className="input w-16 text-center text-lg"
                />
                <input name="name" defaultValue={c.name} className="input w-44 flex-1" />
                <span className="text-xs text-slate-400">{used} ประกาศ</span>
                <SubmitButton className="btn-outline px-3 py-1.5 text-xs">บันทึก</SubmitButton>
              </form>
              {used > 0 ? (
                <button
                  disabled
                  className="btn px-3 py-1.5 text-xs text-slate-300"
                  title="มีประกาศใช้อยู่ ลบไม่ได้"
                >
                  ลบ
                </button>
              ) : (
                <form action={del}>
                  <SubmitButton className="btn px-3 py-1.5 text-xs text-red-500 hover:bg-red-50">
                    ลบ
                  </SubmitButton>
                </form>
              )}
            </div>
          );
        })}
      </div>

      <p className="mt-4 text-xs text-slate-400">
        * กด ▲ ▼ เพื่อจัดลำดับ — ลำดับนี้คือลำดับที่ผู้ซื้อเห็นในเมนูหมวดสินค้าและหน้าลงประกาศ
        <br />* หมวดที่มีประกาศใช้อยู่จะลบไม่ได้ (กันข้อมูลเสีย) — แก้ชื่อ/ไอคอนได้ตลอด
      </p>
    </div>
  );
}
