import { createHmac, timingSafeEqual } from "node:crypto";

// -----------------------------------------------------------------------------
// Session token — เซ็นด้วย HMAC กันปลอม
//
// เดิม cookie เก็บ seller.id ดิบ ๆ ซึ่งเดาไม่ยากเลยเพราะ id โผล่อยู่ใน URL
// รูปสินค้าสาธารณะ (bucket listings เป็น public) ใครก็ก๊อป UUID จาก URL รูป
// ไปใส่ cookie แล้วสวมเป็นร้านนั้นได้ทันที → ต้องเซ็นทุก session
//
// รูปแบบ: <id>.<exp>.<hmac>
// -----------------------------------------------------------------------------

const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 วัน

function secret(): string {
  // SESSION_SECRET ถ้ามี; ไม่มีก็ผูกกับ service key (อยู่ฝั่ง server เท่านั้น)
  const s = process.env.SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  return s;
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("hex");
}

export function createSessionToken(id: string): string {
  const exp = String(Date.now() + MAX_AGE_MS);
  const payload = `${id}.${exp}`;
  return `${payload}.${sign(payload)}`;
}

// คืน id เมื่อ token ถูกต้องและยังไม่หมดอายุ — ไม่งั้นคืน null
export function readSessionToken(token: string | undefined): string | null {
  if (!token || !secret()) return null;

  const i = token.lastIndexOf(".");
  if (i < 0) return null; // cookie รูปแบบเก่า (id ดิบ) → ถือว่าใช้ไม่ได้ ต้องล็อกอินใหม่
  const payload = token.slice(0, i);
  const mac = token.slice(i + 1);

  const expected = sign(payload);
  if (mac.length !== expected.length) return null;
  if (!timingSafeEqual(Buffer.from(mac), Buffer.from(expected))) return null;

  const j = payload.lastIndexOf(".");
  if (j < 0) return null;
  const id = payload.slice(0, j);
  const exp = Number(payload.slice(j + 1));
  if (!Number.isFinite(exp) || Date.now() > exp) return null;

  return id || null;
}
