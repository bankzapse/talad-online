"use client";

import { useRouter, useSearchParams } from "next/navigation";
import type { Category, Area } from "@/lib/types";

export default function Filters({
  categories,
  areas,
}: {
  categories: Category[];
  areas: Area[];
}) {
  const router = useRouter();
  const sp = useSearchParams();

  function update(key: string, value: string) {
    const params = new URLSearchParams(sp.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(`/?${params.toString()}`);
  }

  const cur = (k: string) => sp.get(k) ?? "";

  return (
    <div className="card mb-5 p-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label className="label">ค้นหา</label>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const v = new FormData(e.currentTarget).get("q") as string;
              update("q", v);
            }}
          >
            <input
              name="q"
              defaultValue={cur("q")}
              placeholder="เช่น ผักบุ้ง, กุ้ง, จักรยาน…"
              className="input"
            />
          </form>
        </div>
        <div className="w-full sm:w-40">
          <label className="label">หมวด</label>
          <select
            className="input"
            value={cur("category")}
            onChange={(e) => update("category", e.target.value)}
          >
            <option value="">ทั้งหมด</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.emoji} {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="w-full sm:w-52">
          <label className="label">พื้นที่/ตลาด</label>
          <select
            className="input"
            value={cur("area")}
            onChange={(e) => update("area", e.target.value)}
          >
            <option value="">ทุกพื้นที่</option>
            {areas.map((a) => (
              <option key={a.id} value={a.id}>
                {a.market} ({a.province})
              </option>
            ))}
          </select>
        </div>
        <div className="w-full sm:w-40">
          <label className="label">เรียงตาม</label>
          <select
            className="input"
            value={cur("sort")}
            onChange={(e) => update("sort", e.target.value)}
          >
            <option value="newest">ใหม่ล่าสุด</option>
            <option value="price_asc">ราคาต่ำ → สูง</option>
            <option value="price_desc">ราคาสูง → ต่ำ</option>
          </select>
        </div>
      </div>
    </div>
  );
}
