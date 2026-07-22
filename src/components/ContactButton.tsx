"use client";

import { useState } from "react";
import Spinner from "./Spinner";

export default function ContactButton({
  listingId,
  buyerLoggedIn,
  lineContact,
}: {
  listingId: string;
  buyerLoggedIn: boolean;
  lineContact: string;
}) {
  const [state, setState] = useState<"idle" | "loading" | "sent" | "rate" | "fallback">(
    "idle"
  );

  async function handleClick() {
    // Gate: ต้องล็อกอินก่อน (กันปั่น push + คุมต้นทุน)
    // เข้า /api/auth/line ตรง ๆ → เด้งไป LINE ทันที ไม่ต้องแวะหน้า login ให้กดซ้ำ
    if (!buyerLoggedIn) {
      window.location.href = `/api/auth/line?buyer=1&next=/listing/${listingId}`;
      return;
    }
    setState("loading");
    const res = await fetch("/api/contact", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ listingId }),
    });
    const data = await res.json();
    if (res.ok) setState("sent");
    else if (data.reason === "rate_limited") setState("rate");
    else if (data.reason === "quota_exceeded") setState("fallback");
    else setState("fallback");
  }

  if (state === "sent") {
    return (
      <div className="rounded-lg border border-brand/30 bg-brand-light p-3 text-sm text-brand-dark">
        ✓ แจ้งผู้ขายแล้ว! ผู้ขายจะได้รับการแจ้งเตือนทาง LINE — หรือทักตรงที่{" "}
        <span className="font-semibold">{lineContact}</span>
      </div>
    );
  }
  if (state === "rate") {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
        คุณกดติดต่อประกาศนี้บ่อยเกินไป ลองใหม่อีกครั้งภายหลัง หรือทักตรงที่{" "}
        <span className="font-semibold">{lineContact}</span>
      </div>
    );
  }
  if (state === "fallback") {
    // Fallback เมื่อโควตา push หมด → แสดงช่องทางติดต่อตรง
    return (
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
        ติดต่อผู้ขายได้โดยตรงที่ LINE:{" "}
        <span className="font-semibold text-brand-dark">{lineContact}</span>
      </div>
    );
  }

  return (
    <button
      onClick={handleClick}
      disabled={state === "loading"}
      className="btn-outline w-full py-3 text-base disabled:opacity-70"
    >
      {state === "loading" ? (
        <>
          <Spinner /> กำลังส่ง…
        </>
      ) : (
        "💬 ติดต่อผู้ขาย"
      )}
    </button>
  );
}
