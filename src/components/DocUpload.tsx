"use client";

import { useState } from "react";

// อัปเอกสาร (หน้าสมุดบัญชี) — เก็บ path ลง hidden input ชื่อ bookBankUrl
export default function DocUpload({ existing }: { existing?: string | null }) {
  const [path, setPath] = useState(existing ?? "");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true);
    setMsg(null);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/upload-doc", { method: "POST", body: fd });
    const data = await res.json();
    setBusy(false);
    if (res.ok && data.path) {
      setPath(data.path);
      setMsg(null);
    } else {
      setMsg(
        data.error === "storage_unconfigured"
          ? "ยังไม่ได้เชื่อม Storage"
          : data.error === "bad_type"
          ? "รองรับเฉพาะรูปภาพหรือ PDF"
          : data.error === "too_large"
          ? "ไฟล์ใหญ่เกิน 8MB"
          : "อัปโหลดไม่สำเร็จ"
      );
    }
  }

  return (
    <div>
      <input type="hidden" name="bookBankUrl" value={path} />
      <div className="flex items-center gap-3">
        <label className="btn-outline cursor-pointer text-xs">
          {busy ? "กำลังอัป…" : path ? "เปลี่ยนไฟล์" : "เลือกไฟล์"}
          <input
            type="file"
            accept="image/*,application/pdf"
            className="hidden"
            onChange={onFile}
            disabled={busy}
          />
        </label>
        {path ? (
          <span className="text-xs text-brand-dark">✓ แนบแล้ว</span>
        ) : (
          <span className="text-xs text-slate-400">ยังไม่ได้แนบ</span>
        )}
      </div>
      <p className="mt-1 text-xs text-slate-400">
        รูปหรือ PDF ไม่เกิน 8MB · เก็บเป็นความลับ เห็นได้เฉพาะทีมงานที่ตรวจสอบ
      </p>
      {msg && <p className="mt-1 text-xs text-amber-600">{msg}</p>}
    </div>
  );
}
