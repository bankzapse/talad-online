import { cookies } from "next/headers";
import { getSeller } from "./data";
import type { Seller } from "./types";
import { readSessionToken } from "./session";

// -----------------------------------------------------------------------------
// Auth (MVP stub) — จำลอง "LINE Login" ด้วย cookie เก็บ seller id
// เมื่อต่อ LINE Login จริง: แลก id_token → ได้ lineUserId → map เป็น seller
// ดู README ส่วน "ทำให้ LINE Login ใช้งานจริง"
// -----------------------------------------------------------------------------

export const SESSION_COOKIE = "tr_seller";
export const BUYER_COOKIE = "tr_buyer"; // ผู้ซื้อล็อกอิน (gate ปุ่มติดต่อ)
export const ADMIN_COOKIE = "admin_ok"; // ผู้ดูแลระบบ (middleware เทียบกับ ADMIN_KEY)

// เทียบกับ ADMIN_KEY จริง — แค่ "มี cookie" ใครก็ตั้งเองได้
export async function isAdminLoggedIn(): Promise<boolean> {
  const key = process.env.ADMIN_KEY;
  if (!key) return false;
  const jar = await cookies();
  return jar.get(ADMIN_COOKIE)?.value === key;
}

export async function getCurrentSeller(): Promise<Seller | null> {
  const jar = await cookies();
  const id = readSessionToken(jar.get(SESSION_COOKIE)?.value);
  if (!id) return null;
  return (await getSeller(id)) ?? null;
}

export async function isBuyerLoggedIn(): Promise<boolean> {
  return (await getBuyerKey()) !== null;
}

export async function getBuyerKey(): Promise<string | null> {
  const jar = await cookies();
  return readSessionToken(jar.get(BUYER_COOKIE)?.value);
}
