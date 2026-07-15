"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, BUYER_COOKIE, getCurrentSeller } from "@/lib/auth";
import {
  createListing,
  updateListingStatus,
  getListing,
  startTrial,
  createPayment,
  verifyPayment,
  rejectPayment,
  adjustExpiry,
  setSellerBlocked,
  upsertPackage,
  getPackages,
} from "@/lib/data";
import type { Unit } from "@/lib/types";
import { safeNext } from "@/lib/url";
import { isLineLoginConfigured } from "@/lib/line-login";

// ---------- auth (LINE Login stub) ----------
// เมื่อ LINE Login เปิดใช้จริงแล้ว → ปิด demo login ทั้งหมด (บังคับผ่าน LINE เท่านั้น)
export async function loginAsSeller(sellerId: string, next?: string) {
  if (isLineLoginConfigured()) redirect("/login");
  const jar = await cookies();
  jar.set(SESSION_COOKIE, sellerId, { httpOnly: true, path: "/", maxAge: 60 * 60 * 24 * 30 });
  redirect(safeNext(next, "/sell"));
}

export async function loginAsBuyer(next?: string) {
  if (isLineLoginConfigured()) redirect("/login?buyer=1");
  const jar = await cookies();
  // ผูกกับ id สุ่ม (จริงคือ LINE userId) — ใช้เป็น key rate-limit ปุ่มติดต่อ
  jar.set(BUYER_COOKIE, `buyer-${Math.random().toString(36).slice(2, 10)}`, {
    httpOnly: true,
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  redirect(safeNext(next, "/"));
}

export async function logout() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
  redirect("/");
}

// ---------- listings ----------
// หมายเหตุความปลอดภัย: ทุก action ตรวจ seller จาก session จริง (ไม่เชื่อ id ที่ส่งมา)
// และตรวจสิทธิ์เจ้าของก่อนแก้ข้อมูล (กัน IDOR)
export async function createListingAction(_sellerId: string, formData: FormData) {
  const seller = await getCurrentSeller();
  if (!seller || seller.blocked) redirect("/login");

  let images: string[] = [];
  try {
    const parsed = JSON.parse(String(formData.get("images") || "[]"));
    if (Array.isArray(parsed)) images = parsed.filter((x) => typeof x === "string").slice(0, 8);
  } catch {
    images = [];
  }

  const title = String(formData.get("title") || "").trim().slice(0, 120);
  const description = String(formData.get("description") || "").trim().slice(0, 2000);
  const price = Number(formData.get("price") || 0);
  const categoryId = String(formData.get("categoryId") || "");
  const areaId = String(formData.get("areaId") || "");

  // validation
  if (!title || !categoryId || !areaId) redirect("/sell/new?error=required");
  if (!Number.isFinite(price) || price < 0 || price > 100_000_000)
    redirect("/sell/new?error=price");

  await createListing({
    sellerId: seller!.id,
    title,
    description,
    price,
    unit: String(formData.get("unit") || "ชิ้น") as Unit,
    categoryId,
    areaId,
    images,
  });
  redirect("/sell");
}

export async function setListingStatusAction(id: string, status: "active" | "sold" | "hidden") {
  const seller = await getCurrentSeller();
  if (!seller) redirect("/login");
  const listing = await getListing(id);
  // ตรวจสิทธิ์เจ้าของ — กันแก้ประกาศคนอื่น (IDOR)
  if (!listing || listing.sellerId !== seller!.id) redirect("/sell");
  await updateListingStatus(id, status);
  redirect("/sell");
}

// ---------- membership ----------
export async function startTrialAction(_sellerId: string) {
  const seller = await getCurrentSeller();
  if (!seller) redirect("/login");
  await startTrial(seller!.id);
  redirect("/sell/membership");
}

export async function payAction(_sellerId: string, packageId: string) {
  const seller = await getCurrentSeller();
  if (!seller) redirect("/login");
  // จำลองอัปสลิป → สร้าง payment pending รอ admin/ระบบยืนยัน
  await createPayment(seller!.id, packageId, "demo-slip-uploaded");
  redirect("/sell/membership?paid=1");
}

// ---------- admin ----------
export async function verifyPaymentAction(paymentId: string) {
  await verifyPayment(paymentId);
  redirect("/admin/payments");
}
export async function rejectPaymentAction(paymentId: string) {
  await rejectPayment(paymentId, "ยอด/สลิปไม่ตรง");
  redirect("/admin/payments");
}
export async function moderateAction(id: string, action: "approve" | "remove") {
  await updateListingStatus(id, action === "approve" ? "active" : "hidden");
  redirect("/admin/moderation");
}
export async function adjustExpiryAction(sellerId: string, formData: FormData) {
  const days = Number(formData.get("days") || 0);
  const reason = String(formData.get("reason") || "ปรับด้วยมือ");
  await adjustExpiry(sellerId, days, reason);
  redirect("/admin/payments");
}
export async function toggleBlockAction(sellerId: string, blocked: boolean) {
  await setSellerBlocked(sellerId, blocked);
  redirect("/admin");
}
export async function savePackageAction(formData: FormData) {
  const id = String(formData.get("id"));
  const existing = (await getPackages()).find((p) => p.id === id);
  await upsertPackage({
    id,
    name: existing?.name || id,
    days: existing?.days || 30,
    price: Number(formData.get("price") || 0),
    active: formData.get("active") === "on",
  });
  redirect("/admin/packages");
}
