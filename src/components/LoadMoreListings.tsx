"use client";

import { useState } from "react";
import ListingCard from "./ListingCard";
import Spinner from "./Spinner";
import type { Listing } from "@/lib/types";

interface Row {
  listing: Listing;
  categoryName: string;
  sellerVerified: boolean;
  companyVerified: boolean;
}

// ปุ่ม "โหลดเพิ่ม" — ต่อประกาศชุดถัดไปท้ายรายการเดิม ไม่โหลดหน้าใหม่
// query ปัจจุบันส่งมาจาก server เพื่อให้ผลลัพธ์ตรงกับตัวกรองที่เลือกอยู่
export default function LoadMoreListings({
  query,
  startOffset,
}: {
  query: Record<string, string | undefined>;
  startOffset: number;
}) {
  const [rows, setRows] = useState<Row[]>([]);
  const [offset, setOffset] = useState(startOffset);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  async function loadMore() {
    setLoading(true);
    setFailed(false);
    try {
      const p = new URLSearchParams();
      for (const [k, v] of Object.entries(query)) if (v) p.set(k, v);
      p.set("offset", String(offset));

      const res = await fetch(`/api/listings?${p}`);
      if (!res.ok) throw new Error("failed");
      const data = await res.json();

      setRows((r) => [...r, ...(data.items ?? [])]);
      setOffset(data.nextOffset ?? offset);
      setHasMore(Boolean(data.hasMore));
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {rows.length > 0 && (
        <div className="mt-3 grid grid-cols-2 gap-3 sm:mt-4 sm:grid-cols-3 sm:gap-4">
          {rows.map((r) => (
            <ListingCard
              key={r.listing.id}
              listing={r.listing}
              emoji="🛍️"
              categoryName={r.categoryName}
              sellerVerified={r.sellerVerified}
              companyVerified={r.companyVerified}
            />
          ))}
        </div>
      )}

      {hasMore && (
        <div className="mt-6 text-center">
          <button
            onClick={loadMore}
            disabled={loading}
            className="btn-outline px-6 py-2.5 disabled:opacity-60"
          >
            {loading ? (
              <>
                <Spinner /> กำลังโหลด…
              </>
            ) : (
              "โหลดเพิ่ม"
            )}
          </button>
          {failed && (
            <p className="mt-2 text-xs text-red-600">โหลดไม่สำเร็จ — กดลองใหม่อีกครั้ง</p>
          )}
        </div>
      )}

      {!hasMore && rows.length > 0 && (
        <p className="mt-6 text-center text-sm text-slate-400">— แสดงครบทุกรายการแล้ว —</p>
      )}
    </>
  );
}
