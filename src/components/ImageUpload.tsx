"use client";

import { useState } from "react";

// อัปโหลดรูป → เก็บ URL ใน hidden input ชื่อ "images" (JSON array) ให้ server action อ่าน
const MAX_IMAGES = 10;

export default function ImageUpload() {
  const [urls, setUrls] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (urls.length >= MAX_IMAGES) {
      setMsg(`อัปได้สูงสุด ${MAX_IMAGES} รูป`);
      e.target.value = "";
      return;
    }
    setBusy(true);
    setMsg(null);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    const data = await res.json();
    setBusy(false);
    if (res.ok && data.url) {
      setUrls((u) => [...u, data.url]);
    } else if (data.error === "storage_unconfigured") {
      setMsg("ยังไม่ได้เชื่อม Supabase Storage — ข้ามการอัปรูปได้ (ลงประกาศไม่มีรูปก่อน)");
    } else {
      setMsg("อัปโหลดไม่สำเร็จ: " + (data.error ?? "unknown"));
    }
    e.target.value = "";
  }

  return (
    <div>
      <input type="hidden" name="images" value={JSON.stringify(urls)} />
      <div className="flex flex-wrap gap-2">
        {urls.map((u) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={u} src={u} alt="" className="h-16 w-16 rounded-lg border border-slate-200 object-cover" />
        ))}
        {urls.length < MAX_IMAGES && (
          <label className="flex h-16 w-16 cursor-pointer items-center justify-center rounded-lg border border-dashed border-slate-300 text-2xl text-slate-400 hover:bg-slate-50">
            {busy ? "…" : "+"}
            <input type="file" accept="image/*" className="hidden" onChange={onFile} disabled={busy} />
          </label>
        )}
      </div>
      <p className="mt-1 text-xs text-slate-400">{urls.length}/{MAX_IMAGES} รูป</p>
      {msg && <p className="mt-1 text-xs text-amber-600">{msg}</p>}
    </div>
  );
}
