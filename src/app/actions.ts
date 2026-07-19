"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  SESSION_COOKIE,
  BUYER_COOKIE,
  ADMIN_COOKIE,
  getCurrentSeller,
  getBuyerKey,
} from "@/lib/auth";
import {
  createListing,
  updateListingStatus,
  approveListing,
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
  revokeShopVerification,
  moveCategory,
  updateListing,
  deleteListing,
  submitListingForReview,
  rejectListing,
  createOrder,
  hasOpenOrder,
  consumeStock,
  restoreStock,
  getOrder,
  updateOrder,
  getSeller,
  isSellerActive,
} from "@/lib/data";
import { isValidThaiMobile, normalizePhone, verifyOtp } from "@/lib/otp";
import type { Unit, DeliveryMethod } from "@/lib/types";
import { needsShipping } from "@/lib/types";
import { pushToLineUser } from "@/lib/line";
import { safeNext } from "@/lib/url";
import { isLineLoginConfigured } from "@/lib/line-login";
import { verifySlipAmount } from "@/lib/slip";
import { provinceName, districtName, subdistrictName, isValidGeo } from "@/lib/geo";
import { setAdminPassword, requireAdmin } from "@/lib/admin-auth";
import { createSessionToken } from "@/lib/session";

// ---------- auth (LINE Login stub) ----------
// เมื่อ LINE Login เปิดใช้จริงแล้ว → ปิด demo login ทั้งหมด (บังคับผ่าน LINE เท่านั้น)
export async function loginAsSeller(sellerId: string, next?: string) {
  if (isLineLoginConfigured()) redirect("/login");
  const jar = await cookies();
  jar.set(SESSION_COOKIE, createSessionToken(sellerId), {
    httpOnly: true,
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  redirect(safeNext(next, "/sell"));
}

export async function loginAsBuyer(next?: string) {
  if (isLineLoginConfigured()) redirect("/login?buyer=1");
  const jar = await cookies();
  // ผูกกับ id สุ่ม (จริงคือ LINE userId) — ใช้เป็น key rate-limit ปุ่มติดต่อ
  jar.set(BUYER_COOKIE, createSessionToken(`buyer-${Math.random().toString(36).slice(2, 10)}`), {
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

const DELIVERY_VALUES: DeliveryMethod[] = ["meetup", "cod", "shipping", "prepay"];

function parseDelivery(raw: string): DeliveryMethod {
  return (DELIVERY_VALUES as string[]).includes(raw) ? (raw as DeliveryMethod) : "meetup";
}

// วิธีที่ผู้ซื้อต้องโอนเงินก่อนได้ของ → จำกัดเฉพาะร้านที่ยืนยันตัวตนกับบริษัทแล้ว
function requiresVerified(m: DeliveryMethod): boolean {
  return m === "prepay" || m === "shipping";
}

// ช่องจำนวนคงเหลือ: เว้นว่าง = ไม่จำกัด
function parseStock(raw: FormDataEntryValue | null): number | null {
  const v = String(raw ?? "").trim();
  if (!v) return null;
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0 || n > 1_000_000) return null;
  return Math.floor(n);
}
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
  const deliveryMethod = parseDelivery(String(formData.get("deliveryMethod") || "meetup"));
  // วิธีที่ผู้ซื้อต้องโอนก่อน ใช้ได้เฉพาะร้านที่ยืนยันกับบริษัทแล้ว
  if (requiresVerified(deliveryMethod) && !seller!.companyVerified) {
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
    stock: parseStock(formData.get("stock")),
  });
  redirect("/sell?created=1");
}

// ผู้ขายส่งประกาศให้ทีมงานอนุมัติ
export async function submitListingAction(id: string) {
  const seller = await getCurrentSeller();
  if (!seller || seller.blocked) redirect("/login");
  // สมาชิกหมดอายุ → ส่งไปก็แสดงไม่ได้ ให้ไปต่ออายุก่อน (ไม่กินเวลาทีมงานตรวจ)
  if (!isSellerActive(seller)) redirect("/sell/membership?expired=1");
  const listing = await getListing(id);
  if (!listing || listing.sellerId !== seller!.id) redirect("/sell");
  // ส่งได้จากฉบับร่าง และจากที่ถูกระงับ (แก้แล้วขอตรวจใหม่) — กันกดซ้ำตอนรออนุมัติ/อนุมัติแล้ว
  if (listing!.status !== "draft" && listing!.status !== "hidden") redirect("/sell");
  await submitListingForReview(id);
  redirect("/sell?submitted=1");
}

export async function setListingStatusAction(id: string, status: "active" | "sold" | "hidden") {
  const seller = await getCurrentSeller();
  if (!seller) redirect("/login");
  const listing = await getListing(id);
  // ตรวจสิทธิ์เจ้าของ — กันแก้ประกาศคนอื่น (IDOR)
  if (!listing || listing.sellerId !== seller!.id) redirect("/sell");

  // กันข้ามขั้นตอนอนุมัติ: ปุ่มนี้ใช้สลับ ขายแล้ว↔เปิดขายอีก เท่านั้น
  // ประกาศที่ยังเป็นร่าง/รอตรวจ/ถูกระงับ จะยิงฟอร์มให้กลายเป็น active ไม่ได้
  const from = listing!.status;
  const allowed =
    (from === "active" && (status === "sold" || status === "hidden")) ||
    (from === "sold" && status === "active") ||
    (from === "hidden" && status === "hidden");
  if (!allowed) redirect("/sell?error=state");

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
    lineId: g("lineId", 60),
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
  await requireAdmin();
  const note = formData ? String(formData.get("note") || "") : "";
  await reviewShopVerification(sellerId, approve, note);
  redirect("/admin/verify");
}

// บริษัทยกเลิกการยืนยันร้าน — ร้านจะใช้วิธี "โอนก่อน" ไม่ได้อีก
export async function revokeVerificationAction(sellerId: string, formData: FormData) {
  await requireAdmin();
  const reason = String(formData.get("reason") || "").trim().slice(0, 200);
  await revokeShopVerification(sellerId, reason);
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
  await requireAdmin();
  await verifyPayment(paymentId);
  redirect("/admin/payments");
}
export async function rejectPaymentAction(paymentId: string) {
  await requireAdmin();
  await rejectPayment(paymentId, "ยอด/สลิปไม่ตรง");
  redirect("/admin/payments");
}
export async function moderateAction(id: string, action: "approve" | "remove") {
  await requireAdmin();
  const listing = await getListing(id);
  if (action === "approve") await approveListing(id);
  else await updateListingStatus(id, "hidden");

  // แจ้งผู้ขายทาง LINE — เดิมผู้ขายต้องเข้ามาเช็คเองว่าอนุมัติหรือยัง
  const seller = listing ? await getSeller(listing.sellerId) : undefined;
  await pushToLineUser(
    seller?.lineUserId,
    action === "approve"
      ? `✅ ประกาศ "${listing?.title ?? ""}" ผ่านการตรวจแล้ว — แสดงบนเว็บเรียบร้อย`
      : `⛔ ประกาศ "${listing?.title ?? ""}" ถูกระงับโดยทีมงาน — ติดต่อทีมงานหากต้องการสอบถาม`,
    seller?.displayName
  );
  redirect("/admin/moderation");
}

// ไม่อนุมัติ — ตีกลับให้ผู้ขายแก้ พร้อมเหตุผล (ต่างจาก "ระงับ" ที่ปิดถาวร)
export async function rejectListingAction(id: string, formData: FormData) {
  await requireAdmin();
  const note = String(formData.get("note") || "").trim().slice(0, 200);
  const listing = await getListing(id);
  await rejectListing(id, note);

  const seller = listing ? await getSeller(listing.sellerId) : undefined;
  await pushToLineUser(
    seller?.lineUserId,
    `↩️ ประกาศ "${listing?.title ?? ""}" ยังไม่ผ่านการตรวจ${note ? `\nเหตุผล: ${note}` : ""}\nแก้ไขแล้วกดส่งขออนุมัติใหม่ได้ที่ร้านของฉัน`,
    seller?.displayName
  );
  redirect("/admin/moderation");
}
export async function adjustExpiryAction(sellerId: string, formData: FormData) {
  await requireAdmin();
  const days = Number(formData.get("days") || 0);
  const reason = String(formData.get("reason") || "ปรับด้วยมือ");
  await adjustExpiry(sellerId, days, reason);
  redirect("/admin/payments");
}
export async function toggleBlockAction(sellerId: string, blocked: boolean) {
  await requireAdmin();
  await setSellerBlocked(sellerId, blocked);
  redirect("/admin");
}
// ---------- admin: หมวดหมู่ ----------
export async function createCategoryAction(formData: FormData) {
  await requireAdmin();
  const name = String(formData.get("name") || "").trim().slice(0, 40);
  const emoji = String(formData.get("emoji") || "").trim().slice(0, 4);
  if (name) await createCategory(name, emoji);
  redirect("/admin/categories");
}
export async function updateCategoryAction(id: string, formData: FormData) {
  await requireAdmin();
  const name = String(formData.get("name") || "").trim().slice(0, 40);
  const emoji = String(formData.get("emoji") || "").trim().slice(0, 4);
  if (name) await updateCategory(id, name, emoji);
  redirect("/admin/categories");
}
export async function deleteCategoryAction(id: string) {
  await requireAdmin();
  const ok = await deleteCategory(id);
  redirect(ok ? "/admin/categories" : "/admin/categories?error=inuse");
}

export async function toggleCompanyVerifyAction(sellerId: string, verified: boolean) {
  await requireAdmin();
  await setSellerCompanyVerified(sellerId, verified);
  redirect("/admin");
}

export async function saveAdminPasswordAction(formData: FormData) {
  await requireAdmin();
  const pw = String(formData.get("password") || "");
  const confirm = String(formData.get("confirm") || "");
  if (pw.length < 8) redirect("/admin/settings?error=pwshort");
  if (pw !== confirm) redirect("/admin/settings?error=pwmatch");
  const ok = await setAdminPassword(pw);
  redirect(ok ? "/admin/settings?saved=pw" : "/admin/settings?error=migrate");
}

export async function savePaymentSettingsAction(formData: FormData) {
  await requireAdmin();
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
  await requireAdmin();
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

// ---------- แก้ไข / ลบประกาศ ----------
export async function updateListingAction(id: string, formData: FormData) {
  const seller = await getCurrentSeller();
  if (!seller || seller.blocked) redirect("/login");

  const listing = await getListing(id);
  // ตรวจสิทธิ์เจ้าของก่อนเสมอ (กัน IDOR — แก้ประกาศคนอื่นไม่ได้)
  if (!listing || listing.sellerId !== seller!.id) redirect("/sell");
  // ห้ามแก้ระหว่างทีมงานกำลังตรวจ — ไม่งั้นเนื้อหาเปลี่ยนใต้มือคนตรวจ
  // แอดมินอาจกดอนุมัติของที่ไม่เคยเห็น
  if (listing!.status === "pending_review") redirect("/sell?error=reviewing");

  const back = `/sell/edit/${id}`;
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
  const deliveryMethod = parseDelivery(String(formData.get("deliveryMethod") || "meetup"));

  if (requiresVerified(deliveryMethod) && !seller!.companyVerified) redirect(`${back}?error=prepay`);
  if (!title || !categoryId || !marketName) redirect(`${back}?error=required`);
  if (!isValidGeo(provinceId, districtId, subdistrictId)) redirect(`${back}?error=area`);
  if (!Number.isFinite(price) || price < 0 || price > 100_000_000) redirect(`${back}?error=price`);

  await updateListing(id, {
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
    stock: parseStock(formData.get("stock")),
  });
  redirect("/sell?saved=1");
}

export async function deleteListingAction(id: string) {
  const seller = await getCurrentSeller();
  if (!seller) redirect("/login");
  const listing = await getListing(id);
  if (!listing || listing.sellerId !== seller!.id) redirect("/sell");
  await deleteListing(id);
  redirect("/sell?deleted=1");
}

// ---------- จัดเรียงหมวดสินค้า (admin) ----------
export async function moveCategoryAction(id: string, dir: -1 | 1) {
  await requireAdmin();
  await moveCategory(id, dir);
  redirect("/admin/categories");
}

// ---------- รายการสั่งซื้อ ----------
// ผู้ซื้อสั่งซื้อ — ต้องล็อกอินก่อน (กันสแปม + ผูกออร์เดอร์กับตัวตน)
export async function createOrderAction(listingId: string, formData: FormData) {
  const buyerKey = await getBuyerKey();
  if (!buyerKey) redirect(`/login?buyer=1&next=/listing/${listingId}/order`);

  const listing = await getListing(listingId);
  if (!listing || listing.status !== "active") redirect(`/listing/${listingId}`);
  // ร้านต้องยังใช้งานได้จริง (สมาชิกไม่หมด/ไม่ถูกแบน) — หน้าเช็คแล้วแต่ action ต้องเช็คเองด้วย
  const shop = await getSeller(listing!.sellerId);
  if (!shop || !isSellerActive(shop)) redirect(`/listing/${listingId}`);
  // ห้ามสั่งของร้านตัวเอง
  if (shop!.lineUserId && shop!.lineUserId === buyerKey) redirect(`/listing/${listingId}`);
  // กันสั่งซ้ำรัว ๆ — มีออร์เดอร์ที่ยังรอร้านยืนยันของประกาศนี้อยู่แล้ว
  if (await hasOpenOrder(buyerKey!, listing!.id)) redirect("/orders?dup=1");
  // ของหมดแล้วสั่งไม่ได้
  if (listing!.stock !== null && listing!.stock <= 0) redirect(`/listing/${listingId}`);

  const back = `/listing/${listingId}/order`;
  const buyerName = String(formData.get("buyerName") || "").trim().slice(0, 80);
  const buyerPhone = normalizePhone(String(formData.get("buyerPhone") || "").trim());
  const address = String(formData.get("address") || "").trim().slice(0, 500);
  const note = String(formData.get("note") || "").trim().slice(0, 500);
  const qty = Number(formData.get("qty") || 1);

  if (buyerName.length < 2) redirect(`${back}?error=name`);
  if (!isValidThaiMobile(buyerPhone)) redirect(`${back}?error=phone`);
  // นัดรับไม่ต้องมีที่อยู่ · วิธีอื่นต้องกรอกให้ส่งของได้จริง
  const shipping = needsShipping(listing!.deliveryMethod);
  if (shipping && address.length < 10) redirect(`${back}?error=address`);
  if (!Number.isFinite(qty) || qty < 1 || qty > 10_000) redirect(`${back}?error=qty`);
  if (listing!.stock !== null && qty > listing!.stock) redirect(`${back}?error=stock`);

  const order = await createOrder({
    listingId: listing!.id,
    sellerId: listing!.sellerId,
    buyerKey: buyerKey!,
    buyerName,
    buyerPhone,
    address: shipping ? address : null,
    listingTitle: listing!.title,
    price: listing!.price,
    unit: listing!.unit,
    qty,
    note,
    deliveryMethod: listing!.deliveryMethod,
  });
  if (!order) redirect(`${back}?error=db`);

  // แจ้งผู้ขายทาง LINE ว่ามีออร์เดอร์ใหม่
  await pushToLineUser(
    shop!.lineUserId,
    `🛒 มีรายการสั่งซื้อใหม่!\n${listing!.title} × ${qty}\nผู้ซื้อ: ${buyerName} (${buyerPhone})\nดูรายละเอียด: /sell/orders`,
    shop!.displayName
  );

  redirect("/orders?placed=1");
}

// ตรวจว่าออร์เดอร์นี้เป็นของผู้ขายที่ล็อกอินอยู่จริง (กัน IDOR)
// ลำดับสถานะที่เปลี่ยนได้จริง — กันยิงฟอร์มซ้ำย้อนสถานะ (เช่น ยกเลิกไปแล้วกลับมายืนยัน)
const ORDER_FLOW: Record<string, string[]> = {
  pending: ["confirmed", "shipped", "cancelled"],
  confirmed: ["shipped", "completed", "cancelled"],
  shipped: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
};

// ตรวจว่าออร์เดอร์นี้เป็นของผู้ขายที่ล็อกอินอยู่จริง (กัน IDOR)
// + ร้านที่ถูกระงับต้องแตะออร์เดอร์ไม่ได้ (รวมถึงอ่านชื่อ/เบอร์/ที่อยู่ผู้ซื้อ)
async function ownedOrder(orderId: string, to?: string) {
  const seller = await getCurrentSeller();
  if (!seller) redirect("/login");
  if (seller!.blocked) redirect("/sell");
  const order = await getOrder(orderId);
  if (!order || order.sellerId !== seller!.id) redirect("/sell/orders");
  if (to && !(ORDER_FLOW[order!.status] ?? []).includes(to)) {
    redirect("/sell/orders?error=state");
  }
  return { seller: seller!, order: order! };
}

export async function confirmOrderAction(orderId: string) {
  const { seller, order } = await ownedOrder(orderId, "confirmed");
  await updateOrder(orderId, {
    status: "confirmed",
    confirmedAt: new Date().toISOString(),
  });
  await consumeStock(order.listingId, order.qty);
  await pushToLineUser(
    order.buyerKey,
    `✅ ร้าน ${seller.shopName ?? seller.displayName} ยืนยันรายการสั่งซื้อของคุณแล้ว\n${order.listingTitle} × ${order.qty}\nติดต่อร้าน: ${seller.contactPhone ?? "-"}`,
    "ผู้ซื้อ"
  );
  redirect("/sell/orders");
}

// ใส่เลขพัสดุ → สถานะเป็น "จัดส่งแล้ว" · นัดรับไม่ต้องใส่เลขพัสดุ
export async function shipOrderAction(orderId: string, formData: FormData) {
  const { seller, order } = await ownedOrder(orderId, "shipped");
  const trackingNo = String(formData.get("trackingNo") || "").trim().slice(0, 60);
  const carrier = String(formData.get("carrier") || "").trim().slice(0, 40);

  if (needsShipping(order.deliveryMethod) && trackingNo.length < 4) {
    redirect("/sell/orders?error=tracking");
  }

  await updateOrder(orderId, {
    status: "shipped",
    trackingNo: trackingNo || null,
    carrier: carrier || null,
    ...(order.status === "pending" ? { confirmedAt: new Date().toISOString() } : {}),
  });

  await pushToLineUser(
    order.buyerKey,
    trackingNo
      ? `📦 ร้าน ${seller.shopName ?? seller.displayName} จัดส่งสินค้าแล้ว\n${order.listingTitle}\nขนส่ง: ${carrier || "-"}\nเลขพัสดุ: ${trackingNo}`
      : `📦 ร้าน ${seller.shopName ?? seller.displayName} เตรียมของให้แล้ว — นัดรับได้เลย\n${order.listingTitle}`,
    "ผู้ซื้อ"
  );
  redirect("/sell/orders");
}

export async function completeOrderAction(orderId: string) {
  await ownedOrder(orderId, "completed");
  await updateOrder(orderId, { status: "completed" });
  redirect("/sell/orders");
}

export async function cancelOrderAction(orderId: string, formData: FormData) {
  const { seller, order } = await ownedOrder(orderId, "cancelled");
  const reason = String(formData.get("reason") || "").trim().slice(0, 200);
  // ถ้าเคยยืนยันไปแล้ว สต็อกถูกตัดไป — ยกเลิกต้องคืนของกลับเข้าสต็อก
  if (order.status !== "pending") await restoreStock(order.listingId, order.qty);
  await updateOrder(orderId, { status: "cancelled", cancelReason: reason || null });
  await pushToLineUser(
    order.buyerKey,
    `❌ ร้าน ${seller.shopName ?? seller.displayName} ยกเลิกรายการสั่งซื้อ\n${order.listingTitle}${reason ? `\nเหตุผล: ${reason}` : ""}`,
    "ผู้ซื้อ"
  );
  redirect("/sell/orders");
}

// ผู้ซื้อยกเลิกออร์เดอร์ของตัวเอง — ได้เฉพาะที่ร้านยังไม่จัดส่ง
// ไม่งั้นถ้าร้านเงียบ ผู้ซื้อจะค้างอยู่ที่ "รอร้านยืนยัน" ตลอดไปโดยไม่มีทางออก
export async function cancelOwnOrderAction(orderId: string, formData: FormData) {
  const buyerKey = await getBuyerKey();
  if (!buyerKey) redirect("/login?buyer=1&next=/orders");
  const order = await getOrder(orderId);
  if (!order || order.buyerKey !== buyerKey) redirect("/orders");
  if (order!.status !== "pending" && order!.status !== "confirmed") redirect("/orders?error=state");

  const reason = String(formData.get("reason") || "").trim().slice(0, 200);
  if (order!.status === "confirmed") await restoreStock(order!.listingId, order!.qty);
  await updateOrder(orderId, {
    status: "cancelled",
    cancelReason: reason ? `ผู้ซื้อยกเลิก: ${reason}` : "ผู้ซื้อยกเลิก",
  });

  const shop = await getSeller(order!.sellerId);
  await pushToLineUser(
    shop?.lineUserId,
    `❌ ผู้ซื้อยกเลิกรายการสั่งซื้อ\n${order!.listingTitle} × ${order!.qty}${reason ? `\nเหตุผล: ${reason}` : ""}`,
    shop?.displayName
  );
  redirect("/orders?cancelled=1");
}
