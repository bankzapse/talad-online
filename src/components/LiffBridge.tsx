"use client";

import { useEffect, useRef, useState } from "react";
import Spinner from "./Spinner";
import type { LiffRole } from "@/lib/liff";

// -----------------------------------------------------------------------------
// หน้าพักระหว่างทาง: เปิดจาก Rich Menu → LIFF ให้ id_token → แลกเป็น cookie → ไปต่อ
//
// ทุกทางที่ล้มเหลวถอยไป OAuth ปกติหมด (/api/auth/line) — เปิดนอกแอป LINE,
// LIFF ID ผิด, เน็ตหลุด ผู้ใช้ยังล็อกอินได้อยู่ แค่ช้ากว่านิดเดียว
// -----------------------------------------------------------------------------

const FALLBACK_DELAY = 8000; // LIFF ค้างเกินนี้ ไม่รอแล้ว

export default function LiffBridge({
  liffId,
  role,
  next,
}: {
  liffId: string;
  role: LiffRole;
  next: string;
}) {
  const [note, setNote] = useState("กำลังเข้าสู่ระบบ…");
  const done = useRef(false); // StrictMode เรียก effect ซ้ำ กันยิงซ้อน

  useEffect(() => {
    if (done.current) return;
    done.current = true;

    const oauth = `/api/auth/line?${role === "buyer" ? "buyer=1&" : ""}next=${encodeURIComponent(next)}`;
    const fallback = (why: string) => {
      console.warn("[liff] ถอยไป OAuth ปกติ:", why);
      window.location.replace(oauth);
    };

    // กันค้างหน้าเปล่า ถ้า LIFF ไม่ตอบ
    const timer = setTimeout(() => fallback("timeout"), FALLBACK_DELAY);

    (async () => {
      try {
        if (!liffId) return fallback("ยังไม่ได้ตั้ง LIFF ID");

        const liff = (await import("@line/liff")).default;
        await liff.init({ liffId });

        if (!liff.isLoggedIn()) {
          // นอกแอป LINE และยังไม่ได้ล็อกอิน — ให้ LIFF พาไปล็อกอินแล้ววนกลับมาที่ URL เดิม
          liff.login({ redirectUri: window.location.href });
          return;
        }

        const idToken = liff.getIDToken();
        if (!idToken) return fallback("ไม่มี id_token (scope openid ไม่ได้เปิด?)");

        setNote("กำลังยืนยันตัวตน…");
        const res = await fetch("/api/auth/liff", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ idToken, role }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.ok) return fallback(`server: ${data.reason ?? res.status}`);

        clearTimeout(timer);
        // ร้านใหม่ยังไม่ตั้งชื่อร้าน → พาไปกรอกก่อน ไม่งั้นเข้าไปแล้วทำอะไรไม่ได้
        const to = data.needsProfile ? "/sell/profile?welcome=1&next=/sell/new" : next;
        window.location.replace(to);
      } catch (e) {
        clearTimeout(timer);
        fallback(e instanceof Error ? e.message : String(e));
      }
    })();

    return () => clearTimeout(timer);
  }, [liffId, role, next]);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-slate-500">
      <Spinner />
      <p className="text-sm">{note}</p>
    </div>
  );
}
