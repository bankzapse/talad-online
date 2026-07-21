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
    // ไม่ log เนื้อข้อความ — มีชื่อ/เบอร์ผู้ซื้ออยู่ข้างใน (PDPA)
    console.log(`[LINE push:demo] → ${label} (ข้อความถูกซ่อน ${message.length} ตัวอักษร)`);
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

// -----------------------------------------------------------------------------
// เครื่องมือตรวจสถานะ LINE — ใช้ในหน้า admin และ health check
// -----------------------------------------------------------------------------
export interface LineStatus {
  configured: boolean;
  tokenValid: boolean;
  oaName?: string;
  basicId?: string;
  quotaTotal?: number;
  quotaUsed?: number;
}

export async function getLineStatus(): Promise<LineStatus> {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!token) return { configured: false, tokenValid: false };

  const h = { Authorization: `Bearer ${token}` };
  try {
    const info = await fetch("https://api.line.me/v2/bot/info", { headers: h });
    if (!info.ok) return { configured: true, tokenValid: false };
    const bot = await info.json();

    const [q, c] = await Promise.all([
      fetch("https://api.line.me/v2/bot/message/quota", { headers: h }).then((r) => r.json()).catch(() => null),
      fetch("https://api.line.me/v2/bot/message/quota/consumption", { headers: h }).then((r) => r.json()).catch(() => null),
    ]);

    return {
      configured: true,
      tokenValid: true,
      oaName: bot.displayName,
      basicId: bot.basicId,
      quotaTotal: q?.value,
      quotaUsed: c?.totalUsage,
    };
  } catch {
    return { configured: true, tokenValid: false };
  }
}

// เช็คว่าผู้ใช้เพิ่ม OA เป็นเพื่อนหรือยัง — ถ้ายัง push จะได้ 200 แต่ข้อความไม่ถึง
export async function isFriendWithOA(lineUserId: string | undefined): Promise<boolean | null> {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!token || !lineUserId || !lineUserId.startsWith("U")) return null;
  try {
    const r = await fetch(`https://api.line.me/v2/bot/profile/${lineUserId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (r.status === 404 || r.status === 403) return false; // ยังไม่เพิ่มเพื่อน / บล็อกไว้
    return r.ok ? true : null;
  } catch {
    return null;
  }
}

// ผูก Rich Menu ผู้ขายให้ userId นี้ — เรียกตอนล็อกอินเป็นผู้ขายสำเร็จ
// ผู้ซื้อทั่วไปใช้เมนูเริ่มต้น (ตั้งไว้ตอนรัน scripts/richmenu.mjs)
// ล้มเหลวก็ไม่กระทบการล็อกอิน — แค่เห็นเมนูผู้ซื้อไปก่อน
export async function linkSellerRichMenu(lineUserId: string | undefined): Promise<boolean> {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  const menuId = process.env.LINE_RICHMENU_SELLER;
  if (!token || !menuId || !lineUserId?.startsWith("U")) return false;
  try {
    const r = await fetch(
      `https://api.line.me/v2/bot/user/${lineUserId}/richmenu/${menuId}`,
      { method: "POST", headers: { Authorization: `Bearer ${token}` } }
    );
    return r.ok;
  } catch {
    return false;
  }
}
