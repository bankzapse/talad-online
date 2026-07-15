"use client";

import { useState } from "react";

// อัปโหลดสลิป → เก็บ path ใน hidden input "slipPath" ให้ server action อ่าน
export default function SlipUpload() {
  const [path, setPath] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setMsg(null);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/upload-slip", { method: "POST", body: fd });
    const data = await res.json();
    setBusy(false);
    if (res.ok && data.path) {
      setPath(data.path);
      setMsg("✓ แนบสลิปแล้ว");
    } else if (data.error === "storage_unconfigured") {
      setMsg("ยังไม่ได้เชื่อม Storage — อัปสลิปไม่ได้");
    } else {
      setMsg("อัปโหลดไม่สำเร็จ: " + (data.error ?? "unknown"));
    }
    e.target.value = "";
  }

  return (
    <div>
      <input type="hidden" name="slipPath" value={path} />
      <label className="btn-outline cursor-pointer text-sm">
        {busy ? "กำลังอัป…" : path ? "เปลี่ยนสลิป" : "📎 แนบสลิปการโอน"}
        <input type="file" accept="image/*" className="hidden" onChange={onFile} disabled={busy} />
      </label>
      {msg && <span className="ml-2 text-xs text-brand-dark">{msg}</span>}
    </div>
  );
}
