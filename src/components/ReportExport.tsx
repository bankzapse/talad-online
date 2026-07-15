"use client";

// ปุ่มดาวน์โหลด CSV สรุปรายได้ (สร้างไฟล์ฝั่ง client)
export default function ReportExport({
  rows,
}: {
  rows: { month: string; count: number; revenue: number }[];
}) {
  function download() {
    const header = "เดือน,จำนวนรายการ,รายได้(บาท)\n";
    const body = rows.map((r) => `${r.month},${r.count},${r.revenue}`).join("\n");
    const csv = "﻿" + header + body; // BOM ให้ Excel อ่านไทยถูก
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "revenue-report.csv";
    a.click();
    URL.revokeObjectURL(url);
  }
  return (
    <button onClick={download} className="btn-outline text-xs">
      ⬇️ ดาวน์โหลด CSV
    </button>
  );
}
