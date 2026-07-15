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
import { getServiceClient, isSupabaseReady } from "./supabase/admin";
import { rowToSeller, rowToListing, rowToPayment, rowToPackage } from "./mappers";
import { COMPANY } from "./company";

// ---------- ตั้งค่าบัญชีรับเงิน (admin แก้ได้) ----------
export interface PaymentSettings {
  bankShortName: string;
  bankBranch: string;
  accountNo: string;
  accountName: string;
  promptpayId: string;
}

function defaultPaymentSettings(): PaymentSettings {
  return {
    bankShortName: COMPANY.bank.shortName,
    bankBranch: COMPANY.bank.branch,
    accountNo: COMPANY.bank.accountNo,
    accountName: COMPANY.bank.accountName,
    promptpayId: "",
  };
}

export async function getPaymentSettings(): Promise<PaymentSettings> {
  const def = defaultPaymentSettings();
  if (isSupabaseReady()) {
    try {
      const { data } = await sb().from("settings").select("value").eq("key", "payment").maybeSingle();
      if (data?.value) return { ...def, ...(data.value as Partial<PaymentSettings>) };
    } catch {
      // ตาราง settings ยังไม่ถูกสร้าง → ใช้ค่าเริ่มต้น
    }
    return def;
  }
  const s = db.settings["payment"] as Partial<PaymentSettings> | undefined;
  return { ...def, ...(s ?? {}) };
}

export async function updatePaymentSettings(s: PaymentSettings): Promise<boolean> {
  if (isSupabaseReady()) {
    const { error } = await sb()
      .from("settings")
      .upsert({ key: "payment", value: s, updated_at: new Date().toISOString() });
    if (error) return false; // ตาราง settings ยังไม่ถูกสร้าง → ต้องรัน schema.sql ล่าสุด
    await logAdmin("แก้ไขบัญชีรับเงิน", `${s.bankShortName} ${s.accountNo}`);
    return true;
  }
  db.settings["payment"] = s as unknown as Record<string, unknown>;
  return true;
}

// -----------------------------------------------------------------------------
// Data layer (async) — สองแบ็กเอนด์:
//   • Supabase (service client) เมื่อกรอก env ครบ → persist จริง
//   • in-memory demo store เมื่อยังไม่ตั้งค่า → เห็นของทันทีตอน deploy
// UI เรียกผ่านฟังก์ชันเหล่านี้เหมือนกันทั้งสองโหมด
// -----------------------------------------------------------------------------

const sb = () => getServiceClient()!;

// ---------- reference ----------
export async function getCategories(): Promise<Category[]> {
  if (isSupabaseReady()) {
    const { data } = await sb().from("categories").select("*").order("id");
    return (data ?? []).map((r) => ({ id: r.id, name: r.name, emoji: r.emoji }));
  }
  return db.categories;
}

export async function getAreas(): Promise<Area[]> {
  if (isSupabaseReady()) {
    const { data } = await sb().from("areas").select("*").order("id");
    return (data ?? []).map((r) => ({ id: r.id, province: r.province, market: r.market }));
  }
  return db.areas;
}

export async function getCategory(id: string): Promise<Category | undefined> {
  return (await getCategories()).find((c) => c.id === id);
}

// ---------- จัดการหมวดหมู่ (admin) ----------
export async function categoryListingCount(id: string): Promise<number> {
  if (isSupabaseReady()) {
    const { count } = await sb()
      .from("listings")
      .select("id", { count: "exact", head: true })
      .eq("category_id", id);
    return count ?? 0;
  }
  return db.listings.filter((l) => l.categoryId === id).length;
}

export async function createCategory(name: string, emoji: string): Promise<void> {
  const id = `cat-${Math.random().toString(36).slice(2, 8)}`;
  if (isSupabaseReady()) {
    await sb().from("categories").insert({ id, name, emoji: emoji || "🛍️" });
    return;
  }
  db.categories.push({ id, name, emoji: emoji || "🛍️" });
}

export async function updateCategory(id: string, name: string, emoji: string): Promise<void> {
  if (isSupabaseReady()) {
    await sb().from("categories").update({ name, emoji: emoji || "🛍️" }).eq("id", id);
    return;
  }
  const c = db.categories.find((x) => x.id === id);
  if (c) {
    c.name = name;
    c.emoji = emoji || "🛍️";
  }
}

// ลบได้เฉพาะเมื่อไม่มีประกาศใช้หมวดนี้ (กัน FK พัง) — คืน true ถ้าลบสำเร็จ
export async function deleteCategory(id: string): Promise<boolean> {
  if ((await categoryListingCount(id)) > 0) return false;
  if (isSupabaseReady()) {
    await sb().from("categories").delete().eq("id", id);
    return true;
  }
  const i = db.categories.findIndex((x) => x.id === id);
  if (i >= 0) db.categories.splice(i, 1);
  return true;
}
export async function getArea(id: string): Promise<Area | undefined> {
  return (await getAreas()).find((a) => a.id === id);
}

export async function getSeller(id: string): Promise<Seller | undefined> {
  if (isSupabaseReady()) {
    const { data } = await sb().from("sellers").select("*").eq("id", id).maybeSingle();
    return data ? rowToSeller(data) : undefined;
  }
  return db.sellers.find((s) => s.id === id);
}

export async function getSellerByLineId(lineUserId: string): Promise<Seller | undefined> {
  if (isSupabaseReady()) {
    const { data } = await sb()
      .from("sellers")
      .select("*")
      .eq("line_user_id", lineUserId)
      .maybeSingle();
    return data ? rowToSeller(data) : undefined;
  }
  return db.sellers.find((s) => s.lineUserId === lineUserId);
}

// สร้าง/หา seller จาก LINE Login (upsert by line_user_id)
export async function upsertSellerFromLine(
  lineUserId: string,
  displayName: string
): Promise<Seller> {
  if (isSupabaseReady()) {
    const existing = await getSellerByLineId(lineUserId);
    if (existing) return existing;
    const { data } = await sb()
      .from("sellers")
      .insert({ line_user_id: lineUserId, display_name: displayName })
      .select("*")
      .single();
    return rowToSeller(data!);
  }
  let s = db.sellers.find((x) => x.lineUserId === lineUserId);
  if (!s) {
    s = {
      id: `seller-${Math.random().toString(36).slice(2, 8)}`,
      displayName,
      phone: null,
      phoneVerified: false,
      joinedAt: new Date().toISOString(),
      membershipExpiresAt: null,
      trialUsed: false,
      blocked: false,
      lineUserId,
    };
    db.sellers.push(s);
  }
  return s;
}

export async function getPackages(activeOnly = false): Promise<MembershipPackage[]> {
  if (isSupabaseReady()) {
    let q = sb().from("packages").select("*").order("days");
    if (activeOnly) q = q.eq("active", true);
    const { data } = await q;
    return (data ?? []).map(rowToPackage);
  }
  return db.packages.filter((p) => (activeOnly ? p.active : true));
}

// ---------- listings ----------
export interface ListingQuery {
  categoryId?: string;
  areaId?: string;
  q?: string;
  sort?: "newest" | "price_asc" | "price_desc";
  includeHidden?: boolean;
  status?: Listing["status"];
}

export async function queryListings(opts: ListingQuery = {}): Promise<Listing[]> {
  // หน้า public: โชว์เฉพาะประกาศของผู้ขายที่สมาชิกยัง active + ไม่ถูกแบน
  const publicView = !opts.status && !opts.includeHidden;
  const nowIso = new Date().toISOString();

  if (isSupabaseReady()) {
    const sel = publicView ? "*, sellers!inner(membership_expires_at,blocked)" : "*";
    let q = sb().from("listings").select(sel);
    if (opts.status) q = q.eq("status", opts.status);
    else if (!opts.includeHidden) q = q.eq("status", "active");
    if (publicView) {
      q = q.gt("sellers.membership_expires_at", nowIso).eq("sellers.blocked", false);
    }
    if (opts.categoryId) q = q.eq("category_id", opts.categoryId);
    if (opts.areaId) q = q.eq("area_id", opts.areaId);
    if (opts.q) q = q.or(`title.ilike.%${opts.q}%,description.ilike.%${opts.q}%`);
    if (opts.sort === "price_asc") q = q.order("price", { ascending: true });
    else if (opts.sort === "price_desc") q = q.order("price", { ascending: false });
    else q = q.order("created_at", { ascending: false });
    const { data } = await q;
    const rows = (data ?? []) as unknown as Record<string, unknown>[];
    return rows.map(rowToListing);
  }

  let rows = db.listings.slice();
  if (opts.status) rows = rows.filter((l) => l.status === opts.status);
  else if (!opts.includeHidden) rows = rows.filter((l) => l.status === "active");
  if (publicView) {
    const now = Date.now();
    rows = rows.filter((l) => {
      const s = db.sellers.find((x) => x.id === l.sellerId);
      return (
        s &&
        !s.blocked &&
        s.membershipExpiresAt &&
        new Date(s.membershipExpiresAt).getTime() > now
      );
    });
  }
  if (opts.categoryId) rows = rows.filter((l) => l.categoryId === opts.categoryId);
  if (opts.areaId) rows = rows.filter((l) => l.areaId === opts.areaId);
  if (opts.q) {
    const qq = opts.q.toLowerCase().trim();
    rows = rows.filter(
      (l) => l.title.toLowerCase().includes(qq) || l.description.toLowerCase().includes(qq)
    );
  }
  if (opts.sort === "price_asc") rows.sort((a, b) => a.price - b.price);
  else if (opts.sort === "price_desc") rows.sort((a, b) => b.price - a.price);
  else rows.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return rows;
}

// เช็คว่าผู้ขายยังแสดงประกาศได้ไหม (สมาชิก active + ไม่ถูกแบน)
export function isSellerActive(seller: Seller | undefined): boolean {
  return Boolean(
    seller &&
      !seller.blocked &&
      seller.membershipExpiresAt &&
      new Date(seller.membershipExpiresAt).getTime() > Date.now()
  );
}

export async function getListing(id: string): Promise<Listing | undefined> {
  if (isSupabaseReady()) {
    const { data } = await sb().from("listings").select("*").eq("id", id).maybeSingle();
    return data ? rowToListing(data) : undefined;
  }
  return db.listings.find((l) => l.id === id);
}

export async function getSellerListings(sellerId: string): Promise<Listing[]> {
  if (isSupabaseReady()) {
    const { data } = await sb()
      .from("listings")
      .select("*")
      .eq("seller_id", sellerId)
      .order("created_at", { ascending: false });
    return (data ?? []).map(rowToListing);
  }
  return db.listings
    .filter((l) => l.sellerId === sellerId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function getSellerActiveCount(sellerId: string): Promise<number> {
  if (isSupabaseReady()) {
    const { count } = await sb()
      .from("listings")
      .select("id", { count: "exact", head: true })
      .eq("seller_id", sellerId)
      .eq("status", "active");
    return count ?? 0;
  }
  return db.listings.filter((l) => l.sellerId === sellerId && l.status === "active").length;
}

export interface NewListingInput {
  sellerId: string;
  title: string;
  description: string;
  price: number;
  unit: Listing["unit"];
  categoryId: string;
  areaId: string;
  images?: string[];
  deliveryMethod?: Listing["deliveryMethod"];
}

export async function createListing(input: NewListingInput): Promise<Listing> {
  const flag = checkBlocklist(input.title, input.description);
  const status: Listing["status"] = flag.hit ? "pending_review" : "active";
  const deliveryMethod = input.deliveryMethod ?? "meetup";

  if (isSupabaseReady()) {
    const { data } = await sb()
      .from("listings")
      .insert({
        seller_id: input.sellerId,
        title: input.title,
        description: input.description,
        price: input.price,
        unit: input.unit,
        category_id: input.categoryId,
        area_id: input.areaId,
        images: input.images ?? [],
        status,
        delivery_method: deliveryMethod,
        flagged_keywords: flag.matched,
      })
      .select("*")
      .single();
    return rowToListing(data!);
  }

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
    status,
    deliveryMethod,
    createdAt: new Date().toISOString(),
    reportCount: 0,
    flaggedKeywords: flag.matched,
  };
  db.listings.unshift(listing);
  db.counters.listingsCreated += 1;
  return listing;
}

export async function updateListingStatus(id: string, status: Listing["status"]): Promise<void> {
  if (isSupabaseReady()) {
    await sb().from("listings").update({ status }).eq("id", id);
    return;
  }
  const l = db.listings.find((x) => x.id === id);
  if (l) l.status = status;
}

export async function reportListing(listingId: string, reason: string): Promise<void> {
  if (isSupabaseReady()) {
    await sb().from("reports").insert({ listing_id: listingId, reason });
    const { data } = await sb()
      .from("listings")
      .select("report_count,status")
      .eq("id", listingId)
      .maybeSingle();
    if (data) {
      const rc = Number(data.report_count) + 1;
      const status = rc >= 3 && data.status === "active" ? "pending_review" : data.status;
      await sb().from("listings").update({ report_count: rc, status }).eq("id", listingId);
    }
    return;
  }
  db.reports.unshift({
    id: `r-${Math.random().toString(36).slice(2, 8)}`,
    listingId,
    reason,
    createdAt: new Date().toISOString(),
  });
  const l = db.listings.find((x) => x.id === listingId);
  if (l) {
    l.reportCount += 1;
    if (l.reportCount >= 3 && l.status === "active") l.status = "pending_review";
  }
}

// ---------- ปุ่มติดต่อ: rate-limit + สถิติ ----------
const RATE_WINDOW_MS = 60 * 60 * 1000;
const RATE_MAX = 5;

export async function tryContact(
  listingId: string,
  key: string
): Promise<{ ok: boolean; reason?: string }> {
  if (isSupabaseReady()) {
    const since = new Date(Date.now() - RATE_WINDOW_MS).toISOString();
    const { count } = await sb()
      .from("contact_events")
      .select("id", { count: "exact", head: true })
      .eq("listing_id", listingId)
      .eq("buyer_key", key)
      .gte("created_at", since);
    if ((count ?? 0) >= RATE_MAX) return { ok: false, reason: "rate_limited" };
    await sb().from("contact_events").insert({ listing_id: listingId, buyer_key: key });
    return { ok: true };
  }
  const now = Date.now();
  db.contactEvents = db.contactEvents.filter((e) => now - e.at < RATE_WINDOW_MS);
  const recent = db.contactEvents.filter((e) => e.listingId === listingId && e.key === key);
  if (recent.length >= RATE_MAX) return { ok: false, reason: "rate_limited" };
  db.contactEvents.push({ listingId, key, at: now });
  db.counters.contactClicked += 1;
  return { ok: true };
}

// ---------- membership ----------
export async function startTrial(sellerId: string): Promise<void> {
  const exp = new Date();
  exp.setDate(exp.getDate() + 30);
  if (isSupabaseReady()) {
    const s = await getSeller(sellerId);
    if (s && !s.trialUsed) {
      await sb()
        .from("sellers")
        .update({ trial_used: true, membership_expires_at: exp.toISOString() })
        .eq("id", sellerId);
    }
    return;
  }
  const s = db.sellers.find((x) => x.id === sellerId);
  if (s && !s.trialUsed) {
    s.trialUsed = true;
    s.membershipExpiresAt = exp.toISOString();
    db.counters.trialStarted += 1;
  }
}

export async function createPayment(
  sellerId: string,
  packageId: string,
  slipUrl: string | null,
  amountOverride?: number // ยอดรวมเลขลงท้าย (satang) เพื่อจับคู่สลิป
): Promise<Payment> {
  const pkgs = await getPackages();
  const pkg = pkgs.find((p) => p.id === packageId);
  const amount = amountOverride && amountOverride > 0 ? amountOverride : pkg?.price ?? 0;
  if (isSupabaseReady()) {
    const { data } = await sb()
      .from("payments")
      .insert({
        seller_id: sellerId,
        package_id: packageId,
        amount,
        slip_url: slipUrl,
        status: "pending",
      })
      .select("*")
      .single();
    return rowToPayment(data!);
  }
  const payment: Payment = {
    id: `pay-${Math.random().toString(36).slice(2, 8)}`,
    sellerId,
    packageId,
    amount,
    slipUrl,
    status: "pending",
    createdAt: new Date().toISOString(),
    verifiedAt: null,
  };
  db.payments.unshift(payment);
  return payment;
}

// ยืนยันการจ่าย → ต่ออายุ "ต่อท้ายวันเดิม"
export async function verifyPayment(paymentId: string): Promise<void> {
  if (isSupabaseReady()) {
    const { data: pay } = await sb().from("payments").select("*").eq("id", paymentId).maybeSingle();
    if (!pay || pay.status === "verified") return;
    const pkgs = await getPackages();
    const pkg = pkgs.find((p) => p.id === pay.package_id);
    const seller = await getSeller(pay.seller_id);
    if (!pkg || !seller) return;
    const base =
      seller.membershipExpiresAt && new Date(seller.membershipExpiresAt).getTime() > Date.now()
        ? new Date(seller.membershipExpiresAt)
        : new Date();
    base.setDate(base.getDate() + pkg.days);
    await sb()
      .from("payments")
      .update({ status: "verified", verified_at: new Date().toISOString() })
      .eq("id", paymentId);
    await sb()
      .from("sellers")
      .update({ membership_expires_at: base.toISOString() })
      .eq("id", seller.id);
    await logAdmin("ยืนยันการจ่าย", `${seller.displayName} • ${pkg.name} • ${pkg.price}฿`);
    return;
  }
  const pay = db.payments.find((p) => p.id === paymentId);
  if (!pay || pay.status === "verified") return;
  const pkg = db.packages.find((p) => p.id === pay.packageId);
  const seller = db.sellers.find((s) => s.id === pay.sellerId);
  if (!pkg || !seller) return;
  pay.status = "verified";
  pay.verifiedAt = new Date().toISOString();
  const base =
    seller.membershipExpiresAt && new Date(seller.membershipExpiresAt).getTime() > Date.now()
      ? new Date(seller.membershipExpiresAt)
      : new Date();
  base.setDate(base.getDate() + pkg.days);
  seller.membershipExpiresAt = base.toISOString();
  db.counters.paymentSuccess += 1;
  await logAdmin("ยืนยันการจ่าย", `${seller.displayName} • ${pkg.name} • ${pkg.price}฿`);
}

export async function rejectPayment(paymentId: string, note: string): Promise<void> {
  if (isSupabaseReady()) {
    await sb().from("payments").update({ status: "rejected", note }).eq("id", paymentId);
    return;
  }
  const pay = db.payments.find((p) => p.id === paymentId);
  if (pay) {
    pay.status = "rejected";
    pay.note = note;
  }
}

export async function getPayments(): Promise<Payment[]> {
  if (isSupabaseReady()) {
    const { data } = await sb()
      .from("payments")
      .select("*")
      .order("created_at", { ascending: false });
    return (data ?? []).map(rowToPayment);
  }
  return db.payments;
}

// ประวัติการจ่ายของผู้ขายรายนั้น
export async function getSellerPayments(sellerId: string): Promise<Payment[]> {
  if (isSupabaseReady()) {
    const { data } = await sb()
      .from("payments")
      .select("*")
      .eq("seller_id", sellerId)
      .order("created_at", { ascending: false });
    return (data ?? []).map(rowToPayment);
  }
  return db.payments.filter((p) => p.sellerId === sellerId);
}

export async function getPayment(id: string): Promise<Payment | undefined> {
  if (isSupabaseReady()) {
    const { data } = await sb().from("payments").select("*").eq("id", id).maybeSingle();
    return data ? rowToPayment(data) : undefined;
  }
  return db.payments.find((p) => p.id === id);
}

// ส่งสลิปใหม่ (กรณีถูกปฏิเสธ/ยังไม่ยืนยัน) → กลับเป็น pending รอตรวจอีกครั้ง
export async function resubmitPaymentSlip(paymentId: string, slipUrl: string): Promise<void> {
  if (isSupabaseReady()) {
    await sb()
      .from("payments")
      .update({ slip_url: slipUrl, status: "pending", note: null })
      .eq("id", paymentId);
    return;
  }
  const pay = db.payments.find((p) => p.id === paymentId);
  if (pay) {
    pay.slipUrl = slipUrl;
    pay.status = "pending";
    pay.note = undefined;
  }
}

export async function adjustExpiry(sellerId: string, days: number, reason: string): Promise<void> {
  const seller = await getSeller(sellerId);
  if (!seller) return;
  const base =
    seller.membershipExpiresAt && new Date(seller.membershipExpiresAt).getTime() > Date.now()
      ? new Date(seller.membershipExpiresAt)
      : new Date();
  base.setDate(base.getDate() + days);
  if (isSupabaseReady()) {
    await sb()
      .from("sellers")
      .update({ membership_expires_at: base.toISOString() })
      .eq("id", sellerId);
  } else {
    const s = db.sellers.find((x) => x.id === sellerId);
    if (s) s.membershipExpiresAt = base.toISOString();
  }
  await logAdmin(
    "ปรับวันหมดอายุ",
    `${seller.displayName} • ${days > 0 ? "+" : ""}${days} วัน • ${reason}`
  );
}

export async function logAdmin(action: string, detail: string): Promise<void> {
  if (isSupabaseReady()) {
    await sb().from("admin_logs").insert({ action, detail });
    return;
  }
  db.adminLogs.unshift({
    id: `log-${Math.random().toString(36).slice(2, 8)}`,
    action,
    detail,
    createdAt: new Date().toISOString(),
  });
}

// ---------- admin ----------
export async function getSellers(): Promise<Seller[]> {
  if (isSupabaseReady()) {
    const { data } = await sb().from("sellers").select("*").order("joined_at", { ascending: false });
    return (data ?? []).map(rowToSeller);
  }
  return db.sellers;
}

export async function setSellerBlocked(sellerId: string, blocked: boolean): Promise<void> {
  const s = await getSeller(sellerId);
  if (isSupabaseReady()) {
    await sb().from("sellers").update({ blocked }).eq("id", sellerId);
  } else {
    const local = db.sellers.find((x) => x.id === sellerId);
    if (local) local.blocked = blocked;
  }
  await logAdmin(blocked ? "แบนผู้ใช้" : "ปลดแบน", s?.displayName ?? sellerId);
}

export async function upsertPackage(pkg: MembershipPackage): Promise<void> {
  if (isSupabaseReady()) {
    await sb().from("packages").upsert({
      id: pkg.id,
      name: pkg.name,
      days: pkg.days,
      price: pkg.price,
      active: pkg.active,
    });
    return;
  }
  const i = db.packages.findIndex((p) => p.id === pkg.id);
  if (i >= 0) db.packages[i] = pkg;
  else db.packages.push(pkg);
}

export async function getModerationQueue(): Promise<Listing[]> {
  if (isSupabaseReady()) {
    const { data } = await sb()
      .from("listings")
      .select("*")
      .or("status.eq.pending_review,report_count.gt.0")
      .order("created_at", { ascending: false });
    return (data ?? []).map(rowToListing);
  }
  return db.listings.filter((l) => l.status === "pending_review" || l.reportCount > 0);
}

export async function getAdminLogs() {
  if (isSupabaseReady()) {
    const { data } = await sb()
      .from("admin_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20);
    return (data ?? []).map((r) => ({
      id: String(r.id),
      action: r.action,
      detail: r.detail,
      createdAt: String(r.created_at),
    }));
  }
  return db.adminLogs;
}

export async function getAnalytics() {
  if (isSupabaseReady()) {
    const c = sb();
    const now = new Date().toISOString();
    const [sellersTotal, paying, activeListings, pendingReview, listingsCreated, verifiedPays] =
      await Promise.all([
        c.from("sellers").select("id", { count: "exact", head: true }),
        c
          .from("sellers")
          .select("id", { count: "exact", head: true })
          .eq("trial_used", true)
          .gt("membership_expires_at", now),
        c.from("listings").select("id", { count: "exact", head: true }).eq("status", "active"),
        c.from("listings").select("id", { count: "exact", head: true }).eq("status", "pending_review"),
        c.from("listings").select("id", { count: "exact", head: true }),
        c.from("payments").select("amount").eq("status", "verified"),
      ]);
    const revenue = (verifiedPays.data ?? []).reduce((s, p) => s + Number(p.amount), 0);
    const contactClicked = (await c.from("contact_events").select("id", { count: "exact", head: true })).count ?? 0;
    const paymentSuccess = (verifiedPays.data ?? []).length;
    const trialStarted = (await c.from("sellers").select("id", { count: "exact", head: true }).eq("trial_used", true)).count ?? 0;
    return {
      listingsCreated: listingsCreated.count ?? 0,
      contactClicked,
      trialStarted,
      paymentSuccess,
      sellersTotal: sellersTotal.count ?? 0,
      payingSellers: paying.count ?? 0,
      activeListings: activeListings.count ?? 0,
      pendingReview: pendingReview.count ?? 0,
      revenue,
      conversion: trialStarted > 0 ? Math.round((paymentSuccess / trialStarted) * 100) : 0,
    };
  }

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
