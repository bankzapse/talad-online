"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, BUYER_COOKIE, ADMIN_COOKIE, getCurrentSeller } from "@/lib/auth";
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
  createCategory,
  updateCategory,
  deleteCategory,
  getPayment,
  resubmitPaymentSlip,
  updatePaymentSettings,
  setSellerPhoneVerified,
  setSellerCompanyVerified,
  updateShopProfile,
  reviewShopVerification,
} from "@/lib/data";
import { isValidThaiMobile, normalizePhone, verifyOtp } from "@/lib/otp";
import type { Unit } from "@/lib/types";
import { safeNext } from "@/lib/url";
import { isLineLoginConfigured } from "@/lib/line-login";
import { verifySlipAmount } from "@/lib/slip";
import { provinceName, districtName, subdistrictName, isValidGeo } from "@/lib/geo";
import { setAdminPassword } from "@/lib/admin-auth";

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

// ---------- ออกจากระบบ (ครบทุก role) ----------
// ผู้ขาย · ผู้ซื้อ · แอดมิน — แยกปุ่มได้ และมี "ออกทั้งหมด" สำหรับเครื่องที่ใช้ร่วมกัน
// รับได้ทั้งแบบ bind(null, "/path") และแบบ <form action={logout}> ตรง ๆ (arg เป็น FormData)
function logoutTarget(next: unknown, fallback: string) {
  return safeNext(typeof next === "string" ? next : undefined, fallback);
}

export async function logout(next?: unknown) {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
  redirect(logoutTarget(next, "/"));
}

export async function logoutBuyer(next?: unknown) {
  const jar = await cookies();
  jar.delete(BUYER_COOKIE);
  redirect(logoutTarget(next, "/"));
}

export async function logoutAdmin(next?: unknown) {
  const jar = await cookies();
  jar.delete(ADMIN_COOKIE);
  redirect(logoutTarget(next, "/"));
}

export async function logoutAll(next?: unknown) {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
  jar.delete(BUYER_COOKIE);
  jar.delete(ADMIN_COOKIE);
  redirect(logoutTarget(next, "/"));
}

// ---------- listings ----------
// หมายเหตุความปลอดภัย: ทุก action ตรวจ seller จาก session จริง (ไม่เชื่อ id ที่ส่งมา)
// และตรวจสิทธิ์เจ้าของก่อนแก้ข้อมูล (กัน IDOR)
export async function createListingAction(_sellerId: string, formData: FormData) {
  const seller = await getCurrentSeller();
  if (!seller || seller.blocked) redirect("/login");
  // ต้องกรอกข้อมูลร้าน (ชื่อร้าน) ก่อนลงประกาศ
  if (!seller.shopName) redirect("/sell/profile?next=/sell/new");

  let images: string[] = [];
  try {
    const parsed = JSON.parse(String(formData.get("images") || "[]"));
    if (Array.isArray(parsed)) images = parsed.filter((x) => typeof x === "string").slice(0, 10);
  } catch {
    images = [];
  }

  const title = String(formData.get("title") || "").trim().slice(0, 120);
  const description = String(formData.get("description") || "").trim().slice(0, 2000);
  const price = Number(formData.get("price") || 0);
  const categoryId = String(formData.get("categoryId") || "");
  const provinceId = Number(formData.get("provinceId") || 0);
  const districtId = Number(formData.get("districtId") || 0);
  const subdistrictId = Number(formData.get("subdistrictId") || 0);
  const marketName = String(formData.get("marketName") || "").trim().slice(0, 80);
  const dmRaw = String(formData.get("deliveryMethod") || "meetup");
  let deliveryMethod = (["meetup", "cod", "shipping", "prepay"].includes(dmRaw)
    ? dmRaw
    : "meetup") as "meetup" | "cod" | "shipping" | "prepay";
  // "โอนก่อนรับสินค้า" ใช้ได้เฉพาะร้านที่ยืนยันกับบริษัทแล้ว
  if (deliveryMethod === "prepay" && !seller!.companyVerified) {
    redirect("/sell/new?error=prepay");
  }

  // validation
  if (!title || !categoryId || !marketName) redirect("/sell/new?error=required");
  if (!isValidGeo(provinceId, districtId, subdistrictId)) redirect("/sell/new?error=area");
  if (!Number.isFinite(price) || price < 0 || price > 100_000_000)
    redirect("/sell/new?error=price");

  await createListing({
    sellerId: seller!.id,
    title,
    description,
    price,
    unit: String(formData.get("unit") || "ชิ้น") as Unit,
    categoryId,
    province: provinceName(provinceId)!,
    district: districtName(districtId)!,
    subdistrict: subdistrictName(subdistrictId)!,
    marketName,
    images,
    deliveryMethod,
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

// ---------- ข้อมูลร้านค้า ----------
export async function saveShopProfileAction(formData: FormData) {
  const seller = await getCurrentSeller();
  if (!seller) redirect("/login");
  const g = (k: string, max = 80) => String(formData.get(k) || "").trim().slice(0, max);

  const shopName = g("shopName", 60);
  const contactPhone = normalizePhone(g("contactPhone", 20));
  const next = safeNext(g("next", 200), "/sell");

  if (shopName.length < 2) redirect("/sell/profile?error=name");
  if (!isValidThaiMobile(contactPhone)) redirect("/sell/profile?error=phone");

  const ok = await updateShopProfile(seller!.id, {
    shopName,
    shopAbout: g("shopAbout", 300),
    contactPhone,
    bankName: g("bankName", 60),
    bankAccountNo: g("bankAccountNo", 40),
    bankAccountName: g("bankAccountName", 80),
    companyName: g("companyName", 120),
    bookBankUrl: g("bookBankUrl", 300) || null,
    submitForVerify: formData.get("submitForVerify") === "on",
  });
  if (!ok) redirect("/sell/profile?error=db");
  redirect(next === "/sell" ? "/sell/profile?saved=1" : next);
}

// admin: อนุมัติ/ปฏิเสธเอกสารร้าน
export async function reviewVerificationAction(
  sellerId: string,
  approve: boolean,
  formData?: FormData
) {
  const note = formData ? String(formData.get("note") || "") : "";
  await reviewShopVerification(sellerId, approve, note);
  redirect("/admin/verify");
}

// ---------- ยืนยันเบอร์ (OTP) ----------
export async function verifyPhoneAction(formData: FormData) {
  const seller = await getCurrentSeller();
  if (!seller) redirect("/login");
  const phone = normalizePhone(String(formData.get("phone") || ""));
  const code = String(formData.get("code") || "");
  if (!isValidThaiMobile(phone)) redirect("/sell/verify-phone?error=invalid");

  const ok = await verifyOtp(phone, code); // dev-mode = ผ่าน, provider = ตรวจจริง
  if (!ok) redirect("/sell/verify-phone?error=code");

  const res = await setSellerPhoneVerified(seller!.id, phone);
  if (!res.ok) {
    redirect(`/sell/verify-phone?error=${res.reason === "phone_taken" ? "taken" : "db"}`);
  }
  redirect("/sell?verified=1");
}

// ---------- membership ----------
export async function startTrialAction(_sellerId: string) {
  const seller = await getCurrentSeller();
  if (!seller) redirect("/login");
  await startTrial(seller!.id);
  redirect("/sell/membership");
}

export async function payAction(_sellerId: string, formData: FormData) {
  const seller = await getCurrentSeller();
  if (!seller) redirect("/login");
  const packageId = String(formData.get("packageId") || "");
  const slipPath = String(formData.get("slipPath") || "");
  if (!packageId) redirect("/sell/membership?error=nopkg");
  if (!slipPath) redirect("/sell/membership?error=noslip");

  const pkg = (await getPackages(true)).find((p) => p.id === packageId);
  // ยอดรวมเลขลงท้าย (จาก PackagePicker) — ตรวจว่าจำนวนเต็มตรงกับราคาแพ็ก
  const payAmount = Number(formData.get("payAmount") || 0);
  const amount =
    pkg && payAmount >= pkg.price && payAmount < pkg.price + 1 ? payAmount : pkg?.price;

  const payment = await createPayment(seller!.id, packageId, slipPath, amount);

  // ถ้าตั้งค่า API ตรวจสลิป (SLIP_VERIFY_*) → ยืนยันอัตโนมัติเมื่อยอดตรง (รวมเลขลงท้าย)
  if (pkg) {
    const result = await verifySlipAmount(slipPath, amount ?? pkg.price);
    if (result?.verified) await verifyPayment(payment.id);
  }
  redirect("/sell/membership?paid=1");
}

// ส่งสลิปใหม่ (กรณีถูกปฏิเสธ/ยังไม่ยืนยัน) — ตรวจสิทธิ์เจ้าของ
export async function resubmitSlipAction(paymentId: string, formData: FormData) {
  const seller = await getCurrentSeller();
  if (!seller) redirect("/login");
  const slipPath = String(formData.get("slipPath") || "");
  const pay = await getPayment(paymentId);
  if (!pay || pay.sellerId !== seller!.id) redirect("/sell/membership");
  if (pay.status === "verified") redirect("/sell/membership");
  if (!slipPath) redirect("/sell/membership?error=noslip");
  await resubmitPaymentSlip(paymentId, slipPath);
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
// ---------- admin: หมวดหมู่ ----------
export async function createCategoryAction(formData: FormData) {
  const name = String(formData.get("name") || "").trim().slice(0, 40);
  const emoji = String(formData.get("emoji") || "").trim().slice(0, 4);
  if (name) await createCategory(name, emoji);
  redirect("/admin/categories");
}
export async function updateCategoryAction(id: string, formData: FormData) {
  const name = String(formData.get("name") || "").trim().slice(0, 40);
  const emoji = String(formData.get("emoji") || "").trim().slice(0, 4);
  if (name) await updateCategory(id, name, emoji);
  redirect("/admin/categories");
}
export async function deleteCategoryAction(id: string) {
  const ok = await deleteCategory(id);
  redirect(ok ? "/admin/categories" : "/admin/categories?error=inuse");
}

export async function toggleCompanyVerifyAction(sellerId: string, verified: boolean) {
  await setSellerCompanyVerified(sellerId, verified);
  redirect("/admin");
}

export async function saveAdminPasswordAction(formData: FormData) {
  const pw = String(formData.get("password") || "");
  const confirm = String(formData.get("confirm") || "");
  if (pw.length < 8) redirect("/admin/settings?error=pwshort");
  if (pw !== confirm) redirect("/admin/settings?error=pwmatch");
  const ok = await setAdminPassword(pw);
  redirect(ok ? "/admin/settings?saved=pw" : "/admin/settings?error=migrate");
}

export async function savePaymentSettingsAction(formData: FormData) {
  const ok = await updatePaymentSettings({
    bankShortName: String(formData.get("bankShortName") || "").trim().slice(0, 60),
    bankBranch: String(formData.get("bankBranch") || "").trim().slice(0, 80),
    accountNo: String(formData.get("accountNo") || "").trim().slice(0, 40),
    accountName: String(formData.get("accountName") || "").trim().slice(0, 120),
    promptpayId: String(formData.get("promptpayId") || "").trim().slice(0, 20),
  });
  redirect(ok ? "/admin/settings?saved=1" : "/admin/settings?error=migrate");
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
