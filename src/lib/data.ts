import { db } from "./store";
import type {
  Area,
  Category,
  Listing,
  MembershipPackage,
  Payment,
  Seller,
} from "./types";
import { checkBlocklist } from "./blocklist";

// อ่าน — reference data
export function getCategories(): Category[] {
  return db.categories;
}
export function getAreas(): Area[] {
  return db.areas;
}
export function getCategory(id: string): Category | undefined {
  return db.categories.find((c) => c.id === id);
}
export function getArea(id: string): Area | undefined {
  return db.areas.find((a) => a.id === id);
}
export function getSeller(id: string): Seller | undefined {
  return db.sellers.find((s) => s.id === id);
}
export function getPackages(activeOnly = false): MembershipPackage[] {
  return db.packages.filter((p) => (activeOnly ? p.active : true));
}

// อ่าน — ประกาศ (พร้อม filter/sort)
export interface ListingQuery {
  categoryId?: string;
  areaId?: string;
  q?: string;
  sort?: "newest" | "price_asc" | "price_desc";
  includeHidden?: boolean;
  status?: Listing["status"];
}

export function queryListings(opts: ListingQuery = {}): Listing[] {
  let rows = db.listings.slice();

  if (opts.status) {
    rows = rows.filter((l) => l.status === opts.status);
  } else if (!opts.includeHidden) {
    // ฝั่งผู้ซื้อเห็นเฉพาะ active (หมดอายุ = ซ่อน ไม่ลบ)
    rows = rows.filter((l) => l.status === "active");
  }

  if (opts.categoryId) rows = rows.filter((l) => l.categoryId === opts.categoryId);
  if (opts.areaId) rows = rows.filter((l) => l.areaId === opts.areaId);
  if (opts.q) {
    const q = opts.q.toLowerCase().trim();
    rows = rows.filter(
      (l) =>
        l.title.toLowerCase().includes(q) ||
        l.description.toLowerCase().includes(q)
    );
  }

  switch (opts.sort) {
    case "price_asc":
      rows.sort((a, b) => a.price - b.price);
      break;
    case "price_desc":
      rows.sort((a, b) => b.price - a.price);
      break;
    default:
      rows.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
  }
  return rows;
}

export function getListing(id: string): Listing | undefined {
  return db.listings.find((l) => l.id === id);
}

export function getSellerListings(sellerId: string): Listing[] {
  return db.listings
    .filter((l) => l.sellerId === sellerId)
    .sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
}

// เขียน — ลงประกาศใหม่ (ตรวจ blocklist → เข้าคิว admin ถ้าติด)
export interface NewListingInput {
  sellerId: string;
  title: string;
  description: string;
  price: number;
  unit: Listing["unit"];
  categoryId: string;
  areaId: string;
  images?: string[];
}

export function createListing(input: NewListingInput): Listing {
  const flag = checkBlocklist(input.title, input.description);
  const listing: Listing = {
    id: `l-${Math.random().toString(36).slice(2, 8)}`,
    sellerId: input.sellerId,
    title: input.title,
    description: input.description,
    price: input.price,
    unit: input.unit,
    categoryId: input.categoryId,
    areaId: input.areaId,
    images: input.images ?? [],
    // auto-publish + ถ้าติด blocklist → เข้าคิวตรวจ (pending_review)
    status: flag.hit ? "pending_review" : "active",
    createdAt: new Date().toISOString(),
    reportCount: 0,
    flaggedKeywords: flag.matched,
  };
  db.listings.unshift(listing);
  db.counters.listingsCreated += 1;
  return listing;
}

export function updateListingStatus(id: string, status: Listing["status"]): void {
  const l = getListing(id);
  if (l) l.status = status;
}

export function deleteListing(id: string): void {
  const i = db.listings.findIndex((l) => l.id === id);
  if (i >= 0) db.listings.splice(i, 1);
}

// รายงานประกาศ
export function reportListing(listingId: string, reason: string): void {
  db.reports.unshift({
    id: `r-${Math.random().toString(36).slice(2, 8)}`,
    listingId,
    reason,
    createdAt: new Date().toISOString(),
  });
  const l = getListing(listingId);
  if (l) {
    l.reportCount += 1;
    // ถูก report ถึงเกณฑ์ → เข้าคิวตรวจอัตโนมัติ
    if (l.reportCount >= 3 && l.status === "active") l.status = "pending_review";
  }
}

// ปุ่มติดต่อ — rate limit + นับสถิติ (กันปั่น push + คุมต้นทุน)
const RATE_WINDOW_MS = 60 * 60 * 1000; // 1 ชั่วโมง
const RATE_MAX = 5; // ต่อ key(ผู้ใช้/อุปกรณ์) ต่อประกาศ ต่อชั่วโมง

export function tryContact(
  listingId: string,
  key: string
): { ok: boolean; reason?: string } {
  const now = Date.now();
  // ล้าง event เก่า
  db.contactEvents = db.contactEvents.filter((e) => now - e.at < RATE_WINDOW_MS);
  const recent = db.contactEvents.filter(
    (e) => e.listingId === listingId && e.key === key
  );
  if (recent.length >= RATE_MAX) {
    return { ok: false, reason: "rate_limited" };
  }
  db.contactEvents.push({ listingId, key, at: now });
  db.counters.contactClicked += 1;
  return { ok: true };
}

// สมาชิก
export function startTrial(sellerId: string): void {
  const s = getSeller(sellerId);
  if (s && !s.trialUsed) {
    s.trialUsed = true;
    const exp = new Date();
    exp.setDate(exp.getDate() + 30);
    s.membershipExpiresAt = exp.toISOString();
    db.counters.trialStarted += 1;
  }
}

// สร้างคำขอชำระเงิน (อัปสลิป → รอ admin/ระบบยืนยัน)
export function createPayment(
  sellerId: string,
  packageId: string,
  slipUrl: string | null
): Payment {
  const pkg = db.packages.find((p) => p.id === packageId);
  const payment: Payment = {
    id: `pay-${Math.random().toString(36).slice(2, 8)}`,
    sellerId,
    packageId,
    amount: pkg?.price ?? 0,
    slipUrl,
    status: "pending",
    createdAt: new Date().toISOString(),
    verifiedAt: null,
  };
  db.payments.unshift(payment);
  return payment;
}

// ยืนยันการจ่าย → ต่ออายุแบบ "ต่อท้ายวันเดิม" (กติกาในแผน)
export function verifyPayment(paymentId: string): void {
  const pay = db.payments.find((p) => p.id === paymentId);
  if (!pay || pay.status === "verified") return;
  const pkg = db.packages.find((p) => p.id === pay.packageId);
  const seller = getSeller(pay.sellerId);
  if (!pkg || !seller) return;

  pay.status = "verified";
  pay.verifiedAt = new Date().toISOString();

  // ต่ออายุก่อนหมด = ต่อท้ายวันเดิม / หมดแล้ว = เริ่มจากวันนี้
  const base =
    seller.membershipExpiresAt &&
    new Date(seller.membershipExpiresAt).getTime() > Date.now()
      ? new Date(seller.membershipExpiresAt)
      : new Date();
  base.setDate(base.getDate() + pkg.days);
  seller.membershipExpiresAt = base.toISOString();
  db.counters.paymentSuccess += 1;
  logAdmin("ยืนยันการจ่าย", `${seller.displayName} • ${pkg.name} • ${pkg.price}฿`);
}

export function rejectPayment(paymentId: string, note: string): void {
  const pay = db.payments.find((p) => p.id === paymentId);
  if (pay) {
    pay.status = "rejected";
    pay.note = note;
  }
}

export function getPayments(): Payment[] {
  return db.payments;
}

// admin ปรับวันหมดอายุด้วยมือ + log (grace period/คืนเงิน)
export function adjustExpiry(sellerId: string, days: number, reason: string): void {
  const s = getSeller(sellerId);
  if (!s) return;
  const base =
    s.membershipExpiresAt && new Date(s.membershipExpiresAt).getTime() > Date.now()
      ? new Date(s.membershipExpiresAt)
      : new Date();
  base.setDate(base.getDate() + days);
  s.membershipExpiresAt = base.toISOString();
  logAdmin("ปรับวันหมดอายุ", `${s.displayName} • ${days > 0 ? "+" : ""}${days} วัน • ${reason}`);
}

export function logAdmin(action: string, detail: string): void {
  db.adminLogs.unshift({
    id: `log-${Math.random().toString(36).slice(2, 8)}`,
    action,
    detail,
    createdAt: new Date().toISOString(),
  });
}

// admin — analytics + queue + logs
export function getAnalytics() {
  const sellers = db.sellers;
  const paying = sellers.filter(
    (s) =>
      s.membershipExpiresAt &&
      new Date(s.membershipExpiresAt).getTime() > Date.now() &&
      s.trialUsed
  ).length;
  const revenue = db.payments
    .filter((p) => p.status === "verified")
    .reduce((sum, p) => sum + p.amount, 0);
  return {
    ...db.counters,
    sellersTotal: sellers.length,
    payingSellers: paying,
    activeListings: db.listings.filter((l) => l.status === "active").length,
    pendingReview: db.listings.filter((l) => l.status === "pending_review").length,
    revenue,
    conversion:
      db.counters.trialStarted > 0
        ? Math.round((db.counters.paymentSuccess / db.counters.trialStarted) * 100)
        : 0,
  };
}

export function getModerationQueue(): Listing[] {
  return db.listings.filter(
    (l) => l.status === "pending_review" || l.reportCount > 0
  );
}

export function getAdminLogs() {
  return db.adminLogs;
}

export function getSellers(): Seller[] {
  return db.sellers;
}

export function setSellerBlocked(sellerId: string, blocked: boolean): void {
  const s = getSeller(sellerId);
  if (s) {
    s.blocked = blocked;
    logAdmin(blocked ? "แบนผู้ใช้" : "ปลดแบน", s.displayName);
  }
}

// package admin
export function upsertPackage(pkg: MembershipPackage): void {
  const i = db.packages.findIndex((p) => p.id === pkg.id);
  if (i >= 0) db.packages[i] = pkg;
  else db.packages.push(pkg);
}
