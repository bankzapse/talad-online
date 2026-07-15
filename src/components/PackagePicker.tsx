"use client";

import { useState } from "react";

type Pkg = {
  id: string;
  name: string;
  price: number;
  days: number;
  amount: string; // ยอดที่ต้องโอน (รวมเลขลงท้าย) เช่น "99.37"
  ss: string; // เลขลงท้าย 2 หลัก
  qr: string | null; // PromptPay QR (data URL) ต่อยอดนั้น
};

// เลือกแพ็ก + แสดงยอดโอน (รวมรหัสอ้างอิงเลขลงท้าย) + PromptPay QR ถ้ามี
export default function PackagePicker({
  packages,
  defaultIndex = 1,
}: {
  packages: Pkg[];
  defaultIndex?: number;
}) {
  const [sel, setSel] = useState(packages[defaultIndex]?.id ?? packages[0]?.id ?? "");
  const selected = packages.find((p) => p.id === sel);

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
      <input type="hidden" name="payAmount" value={selected?.amount ?? ""} />

      {selected && (
        <div className="mt-3 flex flex-col items-center gap-3 rounded-xl border border-brand/30 bg-brand-soft p-4 sm:flex-row sm:items-center sm:justify-center">
          {selected.qr && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={selected.qr}
              alt="PromptPay QR"
              className="h-40 w-40 rounded-lg bg-white p-1 shadow-soft"
            />
          )}
          <div className="text-center sm:text-left">
            <div className="text-xs text-slate-500">ยอดที่ต้องโอน (โอนให้ตรงเป๊ะ)</div>
            <div className="text-2xl font-extrabold text-brand-dark">{selected.amount} บาท</div>
            <div className="text-xs text-amber-600">
              ⚠️ เลขลงท้าย <b>.{selected.ss}</b> คือรหัสยืนยันอัตโนมัติ — อย่าปัดเศษ
            </div>
            {selected.qr && (
              <div className="mt-1 text-[11px] text-slate-400">
                สแกน QR ด้วยแอปธนาคาร ยอดจะถูกกรอกให้อัตโนมัติ
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
