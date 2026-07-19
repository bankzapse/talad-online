"use client";

import { useState } from "react";

// อัปโหลดรูป → เก็บ URL ใน hidden input ชื่อ "images" (JSON array) ให้ server action อ่าน
// เลือกได้หลายรูปพร้อมกัน (สูงสุด 10 รูป) · ลบรายรูป · สลับตำแหน่งได้ (ลาก หรือกดลูกศร)
const MAX_IMAGES = 10;

export default function ImageUpload({ initial }: { initial?: string[] }) {
  const [urls, setUrls] = useState<string[]>(initial ?? []);
  const [busy, setBusy] = useState(0);
  const [msg, setMsg] = useState<string | null>(null);
  const [dragFrom, setDragFrom] = useState<number | null>(null);

  async function onFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (picked.length === 0) return;

    const room = MAX_IMAGES - urls.length;
    if (room <= 0) {
      setMsg(`ครบ ${MAX_IMAGES} รูปแล้ว`);
      return;
    }
    const files = picked.slice(0, room);
    setMsg(
      picked.length > room ? `เลือกมา ${picked.length} รูป — อัปได้อีก ${room} รูป` : null
    );
    setBusy(files.length);

    // อัปขนานกัน แล้วค่อยเก็บผลตามลำดับที่เลือก
    const results = await Promise.all(
      files.map(async (file) => {
        const fd = new FormData();
        fd.append("file", file);
        try {
          const res = await fetch("/api/upload", { method: "POST", body: fd });
          const data = await res.json();
          if (res.ok && data.url) return { url: data.url as string };
          return { error: (data.error as string) ?? "unknown" };
        } catch {
          return { error: "network" };
        }
      })
    );
    setBusy(0);

    const ok = results.filter((r) => "url" in r).map((r) => (r as { url: string }).url);
    const failed = results.length - ok.length;
    if (ok.length) setUrls((u) => [...u, ...ok].slice(0, MAX_IMAGES));
    if (failed > 0) {
      const first = results.find((r) => "error" in r) as { error: string } | undefined;
      setMsg(
        first?.error === "storage_unconfigured"
          ? "ยังไม่ได้เชื่อม Supabase Storage — ลงประกาศไม่มีรูปไปก่อนได้"
          : `อัปไม่สำเร็จ ${failed} รูป`
      );
    }
  }

  function remove(url: string) {
    setUrls((u) => u.filter((x) => x !== url));
    setMsg(null);
  }

  // ย้ายรูปจากตำแหน่ง from ไป to (ใช้ทั้งปุ่มลูกศรและการลาก)
  function move(from: number, to: number) {
    setUrls((u) => {
      if (to < 0 || to >= u.length || from === to) return u;
      const next = [...u];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
    setMsg(null);
  }

  return (
    <div>
      <input type="hidden" name="images" value={JSON.stringify(urls)} />
      <div className="flex flex-wrap gap-2">
        {urls.map((u, i) => (
          <div
            key={u}
            draggable
            onDragStart={() => setDragFrom(i)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => {
              if (dragFrom !== null) move(dragFrom, i);
              setDragFrom(null);
            }}
            onDragEnd={() => setDragFrom(null)}
            className={`group relative cursor-grab active:cursor-grabbing ${
              dragFrom === i ? "opacity-40" : ""
            }`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={u}
              alt=""
              draggable={false}
              className="h-16 w-16 rounded-lg border border-slate-200 object-cover"
            />
            {i === 0 && (
              <span className="absolute left-0.5 top-0.5 rounded bg-brand px-1 text-[9px] font-medium text-white">
                ปก
              </span>
            )}
            <button
              type="button"
              onClick={() => remove(u)}
              aria-label="ลบรูป"
              className="absolute -right-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-full bg-slate-700 text-xs text-white opacity-90 hover:bg-red-500"
            >
              ×
            </button>

            {/* ปุ่มสลับตำแหน่ง — ใช้ได้บนมือถือที่ลากไม่ถนัด */}
            {urls.length > 1 && (
              <div className="absolute inset-x-0 bottom-0 flex justify-between rounded-b-lg bg-black/45">
                <button
                  type="button"
                  onClick={() => move(i, i - 1)}
                  disabled={i === 0}
                  aria-label="ย้ายไปทางซ้าย"
                  className="px-1.5 text-xs text-white disabled:opacity-30"
                >
                  ‹
                </button>
                <button
                  type="button"
                  onClick={() => move(i, i + 1)}
                  disabled={i === urls.length - 1}
                  aria-label="ย้ายไปทางขวา"
                  className="px-1.5 text-xs text-white disabled:opacity-30"
                >
                  ›
                </button>
              </div>
            )}
          </div>
        ))}

        {urls.length < MAX_IMAGES && (
          <label className="flex h-16 w-16 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 text-slate-400 hover:bg-slate-50">
            {busy > 0 ? (
              <span className="text-[10px]">กำลังอัป {busy}…</span>
            ) : (
              <>
                <span className="text-2xl leading-none">+</span>
                <span className="text-[9px]">เลือกหลายรูป</span>
              </>
            )}
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={onFiles}
              disabled={busy > 0}
            />
          </label>
        )}
      </div>

      <p className="mt-1 text-xs text-slate-400">
        {urls.length}/{MAX_IMAGES} รูป · เลือกหลายรูปพร้อมกันได้ · รูปแรกเป็นรูปปก
        {urls.length > 1 && " · ลากรูปหรือกด ‹ › เพื่อสลับตำแหน่ง"}
      </p>
      {msg && <p className="mt-1 text-xs text-amber-600">{msg}</p>}
    </div>
  );
}
