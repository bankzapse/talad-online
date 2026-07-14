import { cookies } from "next/headers";
import { getSeller } from "./data";
import type { Seller } from "./types";

// -----------------------------------------------------------------------------
// Auth (MVP stub) — จำลอง "LINE Login" ด้วย cookie เก็บ seller id
// เมื่อต่อ LINE Login จริง: แลก id_token → ได้ lineUserId → map เป็น seller
// ดู README ส่วน "ทำให้ LINE Login ใช้งานจริง"
// -----------------------------------------------------------------------------

export const SESSION_COOKIE = "tr_seller";
export const BUYER_COOKIE = "tr_buyer"; // ผู้ซื้อล็อกอิน (gate ปุ่มติดต่อ)

export async function getCurrentSeller(): Promise<Seller | null> {
  const jar = await cookies();
  const id = jar.get(SESSION_COOKIE)?.value;
  if (!id) return null;
  return getSeller(id) ?? null;
}

export async function isBuyerLoggedIn(): Promise<boolean> {
  const jar = await cookies();
  return Boolean(jar.get(BUYER_COOKIE)?.value);
}

export async function getBuyerKey(): Promise<string | null> {
  const jar = await cookies();
  return jar.get(BUYER_COOKIE)?.value ?? null;
}
