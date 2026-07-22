import { createHmac, timingSafeEqual, randomUUID } from "node:crypto";
import { safeNext } from "./url";

// -----------------------------------------------------------------------------
// state ของ LINE OAuth — เซ็น HMAC ให้ตรวจได้เองโดยไม่ต้องพึ่ง cookie
//
// ทำไมต้องมี: บนมือถือ ผู้ใช้เริ่มล็อกอินใน Chrome/Safari แล้วกด
// "เข้าสู่ระบบด้วยแอป LINE" → LINE เปิดแอปให้ยืนยัน → แล้ว "ส่งกลับมาที่
// in-app browser ของ LINE" ซึ่งเป็นคนละ cookie jar กับเบราว์เซอร์ที่เริ่ม
// cookie line_oauth จึงหาไม่เจอ (หรือเจอของเก่าจากรอบก่อน) → state ไม่ตรง
// → ระบบตีว่าเข้าสู่ระบบไม่ปลอดภัยแล้วยกเลิก = ล็อกอินไม่ได้เลย
//
// ใส่ next/buyer ไว้ใน state เอง แล้วเซ็นกำกับ ข้ามเบราว์เซอร์ก็ยังใช้ได้
// -----------------------------------------------------------------------------

const MAX_AGE_MS = 20 * 60 * 1000; // 20 นาที เท่าอายุ cookie เดิม

function secret(): string {
  return process.env.SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
}

export interface OAuthState {
  next: string;
  buyer: boolean;
}

export function createOAuthState(s: OAuthState): string {
  const body = JSON.stringify({
    n: s.next,
    b: s.buyer ? 1 : 0,
    r: randomUUID(), // กันยิงซ้ำด้วย state เดิม
    e: Date.now() + MAX_AGE_MS,
  });
  const payload = Buffer.from(body, "utf8").toString("base64url");
  const sig = createHmac("sha256", secret()).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

export function readOAuthState(state: string | null | undefined): OAuthState | null {
  if (!state || !secret()) return null;

  const i = state.lastIndexOf(".");
  if (i < 0) return null;
  const payload = state.slice(0, i);
  const mac = state.slice(i + 1);

  const expected = createHmac("sha256", secret()).update(payload).digest("base64url");
  if (mac.length !== expected.length) return null;
  if (!timingSafeEqual(Buffer.from(mac), Buffer.from(expected))) return null;

  try {
    const o = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (typeof o.e !== "number" || Date.now() > o.e) return null;
    return { next: safeNext(typeof o.n === "string" ? o.n : null), buyer: o.b === 1 };
  } catch {
    return null;
  }
}
