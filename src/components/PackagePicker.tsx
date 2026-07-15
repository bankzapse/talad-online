"use client";

import { useState } from "react";

type Pkg = { id: string; name: string; price: number; days: number };

// เลือกแพ็ก + สร้าง "เลขลงท้าย (สตางค์)" เป็นรหัสอ้างอิง กันยอดโอนชนกัน
// ยอดที่ต้องโอน = ราคาแพ็ก + .{satang}  เช่น 99.37 → admin/ระบบจับคู่สลิปได้แม่น
export default function PackagePicker({
  packages,
  defaultIndex = 1,
}: {
  packages: Pkg[];
  defaultIndex?: number;
}) {
  // สร้างเลขลงท้าย 01–99 ครั้งเดียวต่อการเปิดหน้า (ต่อ index เพื่อไม่สุ่มซ้ำใน render)
  const [satang] = useState(() => 1 + Math.floor(Math.random() * 99));
  const [sel, setSel] = useState(
    packages[defaultIndex]?.id ?? packages[0]?.id ?? ""
  );

  const selected = packages.find((p) => p.id === sel);
  const ss = String(satang).padStart(2, "0");
  const amount = selected ? (selected.price + satang / 100).toFixed(2) : "";

  return (
    <div>
      <div className="mb-2 text-xs font-medium text-slate-500">เลือกแพ็ก</div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {packages.map((p) => {
          const perMonth = Math.round((p.price / p.days) * 30);
          const active = sel === p.id;
          return (
            <button
              type="button"
              key={p.id}
              onClick={() => setSel(p.id)}
              className={`card p-3 text-center transition ${
                active ? "border-brand bg-brand-light" : "hover:border-brand/40"
              }`}
            >
              <div className="text-xs font-medium text-slate-700">{p.name}</div>
              <div className="text-lg font-bold text-brand-dark">{p.price}฿</div>
              <div className="text-[10px] text-slate-400">~{perMonth}฿/ด.</div>
            </button>
          );
        })}
      </div>

      <input type="hidden" name="packageId" value={sel} />
      <input type="hidden" name="payAmount" value={amount} />

      {selected && (
        <div className="mt-3 rounded-xl border border-brand/30 bg-brand-soft p-3 text-center">
          <div className="text-xs text-slate-500">ยอดที่ต้องโอน (โอนให้ตรงเป๊ะ)</div>
          <div className="text-2xl font-extrabold text-brand-dark">{amount} บาท</div>
          <div className="text-xs text-amber-600">
            ⚠️ เลขลงท้าย <b>.{ss}</b> คือรหัสยืนยันอัตโนมัติ — อย่าปัดเศษ
          </div>
        </div>
      )}
    </div>
  );
}
