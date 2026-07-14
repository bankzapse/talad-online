"use client";

import { useState } from "react";

export default function ReportButton({ listingId }: { listingId: string }) {
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(false);
  const reasons = ["สินค้าผิดกฎหมาย/ต้องห้าม", "หลอกลวง/มิจฉาชีพ", "ประกาศซ้ำ/สแปม", "อื่นๆ"];

  async function submit(reason: string) {
    await fetch("/api/report", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ listingId, reason }),
    });
    setDone(true);
    setOpen(false);
  }

  if (done)
    return <span className="text-xs text-slate-400">✓ รายงานแล้ว ขอบคุณครับ</span>;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="text-xs text-slate-400 underline hover:text-red-500"
      >
        รายงานประกาศนี้
      </button>
      {open && (
        <div className="absolute right-0 z-10 mt-1 w-56 rounded-lg border border-slate-200 bg-white p-1 shadow-lg">
          {reasons.map((r) => (
            <button
              key={r}
              onClick={() => submit(r)}
              className="block w-full rounded px-3 py-2 text-left text-sm hover:bg-slate-50"
            >
              {r}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
