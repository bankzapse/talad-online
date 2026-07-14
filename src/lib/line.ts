import type { Seller } from "./types";

// -----------------------------------------------------------------------------
// LINE Messaging API — push แจ้งเตือนผู้ขาย
// ตั้งค่า LINE_CHANNEL_ACCESS_TOKEN เพื่อใช้งานจริง; ถ้าไม่ตั้ง จะ log เฉยๆ (demo)
// รองรับ fallback: ถ้าโควตา push หมด (HTTP 429) → คืน "quota_exceeded"
// ให้ฝั่ง UI แสดงช่องทางติดต่อตรงแทน
// -----------------------------------------------------------------------------

export type PushResult = "sent" | "logged" | "quota_exceeded" | "error";

export async function pushToSeller(
  seller: Seller | undefined,
  message: string
): Promise<PushResult> {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;

  if (!token || !seller?.lineUserId) {
    // demo mode — ยังไม่ได้ตั้งค่า LINE หรือผู้ขายยังไม่ผูก LINE
    console.log(`[LINE push:demo] → ${seller?.displayName ?? "?"}: ${message}`);
    return "logged";
  }

  try {
    const res = await fetch("https://api.line.me/v2/bot/message/push", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        to: seller.lineUserId,
        messages: [{ type: "text", text: message }],
      }),
    });
    if (res.status === 429) return "quota_exceeded"; // โควตา push หมด
    if (!res.ok) return "error";
    return "sent";
  } catch {
    return "error";
  }
}
