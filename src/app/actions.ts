"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, BUYER_COOKIE } from "@/lib/auth";
import {
  createListing,
  updateListingStatus,
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

// ---------- auth (LINE Login stub) ----------
export async function loginAsSeller(sellerId: string, next?: string) {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, sellerId, { httpOnly: true, path: "/", maxAge: 60 * 60 * 24 * 30 });
  redirect(next || "/sell");
}

export async function loginAsBuyer(next?: string) {
  const jar = await cookies();
  // ผูกกับ id สุ่ม (จริงคือ LINE userId) — ใช้เป็น key rate-limit ปุ่มติดต่อ
  jar.set(BUYER_COOKIE, `buyer-${Math.random().toString(36).slice(2, 10)}`, {
    httpOnly: true,
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  redirect(next || "/");
}

export async function logout() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
  redirect("/");
}

// ---------- listings ----------
export async function createListingAction(sellerId: string, formData: FormData) {
  createListing({
    sellerId,
    title: String(formData.get("title") || "").trim(),
    description: String(formData.get("description") || "").trim(),
    price: Number(formData.get("price") || 0),
    unit: String(formData.get("unit") || "ชิ้น") as Unit,
    categoryId: String(formData.get("categoryId") || ""),
    areaId: String(formData.get("areaId") || ""),
  });
  redirect("/sell");
}

export async function setListingStatusAction(id: string, status: "active" | "sold" | "hidden") {
  updateListingStatus(id, status);
  redirect("/sell");
}

// ---------- membership ----------
export async function startTrialAction(sellerId: string) {
  startTrial(sellerId);
  redirect("/sell/membership");
}

export async function payAction(sellerId: string, packageId: string) {
  // จำลองอัปสลิป → สร้าง payment pending รอ admin/ระบบยืนยัน
  createPayment(sellerId, packageId, "demo-slip-uploaded");
  redirect("/sell/membership?paid=1");
}

// ---------- admin ----------
export async function verifyPaymentAction(paymentId: string) {
  verifyPayment(paymentId);
  redirect("/admin/payments");
}
export async function rejectPaymentAction(paymentId: string) {
  rejectPayment(paymentId, "ยอด/สลิปไม่ตรง");
  redirect("/admin/payments");
}
export async function moderateAction(id: string, action: "approve" | "remove") {
  updateListingStatus(id, action === "approve" ? "active" : "hidden");
  redirect("/admin/moderation");
}
export async function adjustExpiryAction(sellerId: string, formData: FormData) {
  const days = Number(formData.get("days") || 0);
  const reason = String(formData.get("reason") || "ปรับด้วยมือ");
  adjustExpiry(sellerId, days, reason);
  redirect("/admin/payments");
}
export async function toggleBlockAction(sellerId: string, blocked: boolean) {
  setSellerBlocked(sellerId, blocked);
  redirect("/admin");
}
export async function savePackageAction(formData: FormData) {
  const id = String(formData.get("id"));
  const existing = getPackages().find((p) => p.id === id);
  upsertPackage({
    id,
    name: existing?.name || id,
    days: existing?.days || 30,
    price: Number(formData.get("price") || 0),
    active: formData.get("active") === "on",
  });
  redirect("/admin/packages");
}
