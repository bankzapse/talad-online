"use client";

import { useState } from "react";

// แกลเลอรีรูปสินค้า — รูปใหญ่ + list รูปย่อยใต้ภาพ กดเลือกได้
export default function Gallery({
  images,
  alt,
  fallback,
}: {
  images: string[];
  alt: string;
  fallback: string;
}) {
  const [active, setActive] = useState(0);

  if (images.length === 0) {
    return (
      <div className="card flex aspect-square items-center justify-center bg-gradient-to-br from-slate-100 to-slate-50 text-8xl">
        <span>{fallback}</span>
      </div>
    );
  }

  const current = images[Math.min(active, images.length - 1)];

  return (
    <div>
      <div className="card relative flex aspect-square items-center justify-center overflow-hidden bg-gradient-to-br from-slate-100 to-slate-50">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={current} alt={alt} className="h-full w-full rounded-xl object-cover" />

        {images.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => setActive((i) => (i - 1 + images.length) % images.length)}
              aria-label="รูปก่อนหน้า"
              className="absolute left-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-white/85 text-lg text-slate-700 shadow-soft hover:bg-white"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={() => setActive((i) => (i + 1) % images.length)}
              aria-label="รูปถัดไป"
              className="absolute right-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-white/85 text-lg text-slate-700 shadow-soft hover:bg-white"
            >
              ›
            </button>
            <span className="absolute bottom-2 right-2 rounded-full bg-black/55 px-2 py-0.5 text-xs text-white">
              {active + 1}/{images.length}
            </span>
          </>
        )}
      </div>

      {images.length > 1 && (
        <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
          {images.map((src, i) => (
            <button
              key={src}
              type="button"
              onClick={() => setActive(i)}
              aria-label={`ดูรูปที่ ${i + 1}`}
              aria-current={i === active}
              className={`shrink-0 overflow-hidden rounded-lg border-2 transition ${
                i === active
                  ? "border-brand"
                  : "border-transparent opacity-70 hover:opacity-100"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" className="h-16 w-16 object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
