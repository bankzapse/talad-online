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
  return pushToLineUser(seller?.lineUserId, message, seller?.displayName);
}

// push หา LINE userId ตรง ๆ — ใช้แจ้งผู้ซื้อเรื่องออร์เดอร์
// buyerKey จะเป็น LINE userId จริงเมื่อล็อกอินผ่าน LINE (ขึ้นต้น "U")
// ถ้าเป็น demo buyer (buyer-xxxx) จะ push ไม่ได้ → คืน "logged"
export async function pushToLineUser(
  lineUserId: string | undefined,
  message: string,
  label = "?"
): Promise<PushResult> {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;

  if (!token || !lineUserId || !lineUserId.startsWith("U")) {
    // demo mode — ยังไม่ได้ตั้งค่า LINE หรือปลายทางยังไม่ผูก LINE
    console.log(`[LINE push:demo] → ${label}: ${message}`);
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
        to: lineUserId,
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
