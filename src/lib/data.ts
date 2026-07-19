import { db } from "./store";
import type {
  Area,
  Category,
  Listing,
  MembershipPackage,
  Payment,
  Seller,
  Order,
  DeliveryMethod,
} from "./types";
import { checkBlocklist } from "./blocklist";
import { getServiceClient, isSupabaseReady } from "./supabase/admin";
import { rowToSeller, rowToListing, rowToPayment, rowToPackage, rowToOrder } from "./mappers";
import { COMPANY } from "./company";
import { TRIAL_DAYS } from "./packages";

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
    // เรียงตาม sort_order (admin จัดลำดับเองได้) — ถ้ายังไม่ได้ migrate ให้ fallback เรียงตาม id
    let res = await sb().from("categories").select("*").order("sort_order").order("id");
    if (res.error) res = await sb().from("categories").select("*").order("id");
    return (res.data ?? []).map((r, i) => ({
      id: r.id,
      name: r.name,
      emoji: r.emoji,
      sortOrder: Number(r.sort_order ?? (i + 1) * 10),
    }));
  }
  return [...db.categories].sort((a, b) => a.sortOrder - b.sortOrder);
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
  const existing = await getCategories();
  const sortOrder = (existing.at(-1)?.sortOrder ?? 0) + 10; // ต่อท้ายรายการ
  if (isSupabaseReady()) {
    const row = { id, name, emoji: emoji || "🛍️" };
    const res = await sb().from("categories").insert({ ...row, sort_order: sortOrder });
    if (res.error) await sb().from("categories").insert(row); // ยังไม่ migrate
    return;
  }
  db.categories.push({ id, name, emoji: emoji || "🛍️", sortOrder });
}

// เลื่อนหมวดขึ้น/ลงหนึ่งขั้น (dir = -1 ขึ้น, +1 ลง)
// เขียน sort_order ใหม่ทั้งชุดแบบ 10,20,30… — กันกรณีหมวดเก่ามีค่าซ้ำกัน (default เดิม 100)
// ซึ่งถ้าใช้วิธีสลับค่ากันตรง ๆ จะกดแล้วไม่ขยับ
export async function moveCategory(id: string, dir: -1 | 1): Promise<void> {
  const cats = await getCategories();
  const i = cats.findIndex((c) => c.id === id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= cats.length) return;

  const next = [...cats];
  [next[i], next[j]] = [next[j], next[i]];

  if (isSupabaseReady()) {
    await Promise.all(
      next.map((c, idx) =>
        sb().from("categories").update({ sort_order: (idx + 1) * 10 }).eq("id", c.id)
      )
    );
    return;
  }
  next.forEach((c, idx) => {
    const d = db.categories.find((x) => x.id === c.id);
    if (d) d.sortOrder = (idx + 1) * 10;
  });
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

export async function getSellerByPhone(phone: string): Promise<Seller | undefined> {
  if (isSupabaseReady()) {
    const { data } = await sb().from("sellers").select("*").eq("phone", phone).maybeSingle();
    return data ? rowToSeller(data) : undefined;
  }
  return db.sellers.find((s) => s.phone === phone);
}

// ยืนยันเบอร์: 1 เบอร์ = 1 บัญชี (กันสมัครซ้ำ) → set phone + phone_verified
export async function setSellerPhoneVerified(
  sellerId: string,
  phone: string
): Promise<{ ok: boolean; reason?: string }> {
  const owner = await getSellerByPhone(phone);
  if (owner && owner.id !== sellerId) return { ok: false, reason: "phone_taken" };
  if (isSupabaseReady()) {
    const { error } = await sb()
      .from("sellers")
      .update({ phone, phone_verified: true })
      .eq("id", sellerId);
    if (error) return { ok: false, reason: "db_error" };
    return { ok: true };
  }
  const s = db.sellers.find((x) => x.id === sellerId);
  if (s) {
    s.phone = phone;
    s.phoneVerified = true;
  }
  return { ok: true };
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
      companyVerified: false,
      shopName: null,
      shopAbout: null,
      contactPhone: null,
      lineId: null,
      bankName: null,
      bankAccountNo: null,
      bankAccountName: null,
      companyName: null,
      bookBankUrl: null,
      verifyStatus: "none",
      verifyNote: null,
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
  province?: string;
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
    if (opts.province) q = q.eq("province", opts.province);
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
  if (opts.province) rows = rows.filter((l) => l.province === opts.province);
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
  province: string;
  district: string;
  subdistrict: string;
  marketName: string;
  images?: string[];
  deliveryMethod?: Listing["deliveryMethod"];
}

export async function createListing(input: NewListingInput): Promise<Listing> {
  const flag = checkBlocklist(input.title, input.description);
  // ประกาศใหม่เริ่มเป็น "ฉบับร่าง" เสมอ — ผู้ขายต้องกดส่งขออนุมัติ แล้วทีมงานอนุมัติจึงแสดง
  const status: Listing["status"] = "draft";
  const deliveryMethod = input.deliveryMethod ?? "meetup";

  if (isSupabaseReady()) {
    const base = {
      seller_id: input.sellerId,
      title: input.title,
      description: input.description,
      price: input.price,
      unit: input.unit,
      category_id: input.categoryId,
      province: input.province,
      district: input.district,
      subdistrict: input.subdistrict,
      market_name: input.marketName,
      images: input.images ?? [],
      status,
      flagged_keywords: flag.matched,
    };
    let res = await sb()
      .from("listings")
      .insert({ ...base, delivery_method: deliveryMethod })
      .select("*")
      .single();
    // เผื่อยังไม่ได้ migrate คอลัมน์ delivery_method → ลงประกาศได้โดยไม่พัง
    if (res.error) {
      res = await sb().from("listings").insert(base).select("*").single();
    }
    // เผื่อยังไม่ได้ migrate สถานะ 'draft' เข้า enum → ใช้ pending_review แทน (ยังไม่แสดงเหมือนกัน)
    if (res.error) {
      res = await sb()
        .from("listings")
        .insert({ ...base, status: "pending_review", delivery_method: deliveryMethod })
        .select("*")
        .single();
    }
    if (res.error || !res.data) throw new Error(res.error?.message ?? "insert failed");
    return rowToListing(res.data);
  }

  const listing: Listing = {
    id: `l-${Math.random().toString(36).slice(2, 8)}`,
    sellerId: input.sellerId,
    title: input.title,
    description: input.description,
    price: input.price,
    unit: input.unit,
    categoryId: input.categoryId,
    areaId: null,
    province: input.province,
    district: input.district,
    subdistrict: input.subdistrict,
    marketName: input.marketName,
    images: input.images ?? [],
    status,
    deliveryMethod,
    createdAt: new Date().toISOString(),
    reportCount: 0,
    flaggedKeywords: flag.matched,
    reviewNote: null,
  };
  db.listings.unshift(listing);
  db.counters.listingsCreated += 1;
  return listing;
}

// ---------- แก้ไข / ลบประกาศ (เจ้าของเท่านั้น — ตรวจสิทธิ์ที่ actions.ts) ----------
export interface EditListingInput {
  title: string;
  description: string;
  price: number;
  unit: Listing["unit"];
  categoryId: string;
  province: string;
  district: string;
  subdistrict: string;
  marketName: string;
  images: string[];
  deliveryMethod: Listing["deliveryMethod"];
}

export async function updateListing(id: string, input: EditListingInput): Promise<void> {
  // แก้ข้อความแล้วต้องตรวจ blocklist ใหม่ — กันแก้ประกาศให้กลายเป็นของต้องห้ามทีหลัง
  const flag = checkBlocklist(input.title, input.description);
  const current = await getListing(id);
  // ประกาศที่แสดงอยู่/ขายแล้ว เมื่อถูกแก้ต้องผ่านการอนุมัติอีกครั้ง
  // ส่วนฉบับร่างกับที่รออนุมัติอยู่ ให้คงสถานะเดิม
  const resubmit = current?.status === "active" || current?.status === "sold" || flag.hit;

  if (isSupabaseReady()) {
    const patch: Record<string, unknown> = {
      title: input.title,
      description: input.description,
      price: input.price,
      unit: input.unit,
      category_id: input.categoryId,
      province: input.province,
      district: input.district,
      subdistrict: input.subdistrict,
      market_name: input.marketName,
      images: input.images,
      delivery_method: input.deliveryMethod,
      flagged_keywords: flag.matched,
    };
    // แก้ประกาศที่อนุมัติแล้ว → กลับเข้าคิวตรวจใหม่ (ไม่งั้นแก้เป็นอะไรก็ได้หลังผ่านอนุมัติ)
    if (resubmit) {
      patch.status = "pending_review";
      patch.review_note = null;
    }
    await sb().from("listings").update(patch).eq("id", id);
    return;
  }

  const l = db.listings.find((x) => x.id === id);
  if (!l) return;
  Object.assign(l, {
    title: input.title,
    description: input.description,
    price: input.price,
    unit: input.unit,
    categoryId: input.categoryId,
    province: input.province,
    district: input.district,
    subdistrict: input.subdistrict,
    marketName: input.marketName,
    images: input.images,
    deliveryMethod: input.deliveryMethod,
    flaggedKeywords: flag.matched,
    ...(resubmit ? { status: "pending_review" as const, reviewNote: null } : {}),
  });
}

export async function deleteListing(id: string): Promise<void> {
  if (isSupabaseReady()) {
    await sb().from("listings").delete().eq("id", id);
    return;
  }
  const i = db.listings.findIndex((x) => x.id === id);
  if (i >= 0) db.listings.splice(i, 1);
}

// ผู้ขายกดส่งขออนุมัติ — ได้เฉพาะฉบับร่าง (หรือที่ถูกตีกลับ)
export async function submitListingForReview(id: string): Promise<void> {
  if (isSupabaseReady()) {
    const res = await sb()
      .from("listings")
      .update({ status: "pending_review", review_note: null })
      .eq("id", id);
    if (res.error) await sb().from("listings").update({ status: "pending_review" }).eq("id", id);
    return;
  }
  const l = db.listings.find((x) => x.id === id);
  if (l) {
    l.status = "pending_review";
    l.reviewNote = null;
  }
}

// admin ไม่อนุมัติ → ตีกลับเป็นฉบับร่างพร้อมเหตุผล ให้ผู้ขายแก้แล้วส่งใหม่ได้
export async function rejectListing(id: string, note: string): Promise<void> {
  const reason = note || "ไม่ผ่านการตรวจสอบ";
  if (isSupabaseReady()) {
    const res = await sb()
      .from("listings")
      .update({ status: "draft", review_note: reason })
      .eq("id", id);
    if (res.error) await sb().from("listings").update({ status: "hidden" }).eq("id", id);
  } else {
    const l = db.listings.find((x) => x.id === id);
    if (l) {
      l.status = "draft";
      l.reviewNote = reason;
    }
  }
  await logAdmin("ไม่อนุมัติประกาศ", `${id} — ${reason}`);
}

// คิวรออนุมัติของ admin (แยกจากประกาศที่ถูกรายงาน)
export async function countPendingListings(): Promise<number> {
  if (isSupabaseReady()) {
    const { count } = await sb()
      .from("listings")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending_review");
    return count ?? 0;
  }
  return db.listings.filter((l) => l.status === "pending_review").length;
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
  exp.setDate(exp.getDate() + TRIAL_DAYS);
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

export interface ShopProfileInput {
  shopName: string;
  shopAbout: string;
  contactPhone: string;
  lineId?: string;
  bankName?: string;
  bankAccountNo?: string;
  bankAccountName?: string;
  companyName?: string;
  bookBankUrl?: string | null;
  submitForVerify?: boolean; // ยื่นเอกสารให้บริษัทอนุมัติ
}

export async function updateShopProfile(
  sellerId: string,
  p: ShopProfileInput
): Promise<boolean> {
  const patch: Record<string, unknown> = {
    shop_name: p.shopName,
    shop_about: p.shopAbout,
    contact_phone: p.contactPhone,
    line_id: p.lineId || null,
    bank_name: p.bankName ?? null,
    bank_account_no: p.bankAccountNo ?? null,
    bank_account_name: p.bankAccountName ?? null,
    company_name: p.companyName ?? null,
  };
  if (p.bookBankUrl) patch.book_bank_url = p.bookBankUrl;
  if (p.submitForVerify) {
    patch.verify_status = "pending";
    patch.verify_note = null;
  }

  if (isSupabaseReady()) {
    const { error } = await sb().from("sellers").update(patch).eq("id", sellerId);
    if (!error) return true;
    // เผื่อยังไม่ได้ migrate line_id → บันทึกข้อมูลที่เหลือได้ ไม่ให้ฟอร์มพัง
    const { line_id: _drop, ...rest } = patch;
    const retry = await sb().from("sellers").update(rest).eq("id", sellerId);
    return !retry.error;
  }
  const s = db.sellers.find((x) => x.id === sellerId);
  if (s) {
    s.shopName = p.shopName;
    s.shopAbout = p.shopAbout;
    s.contactPhone = p.contactPhone;
    s.lineId = p.lineId || null;
    s.bankName = p.bankName ?? null;
    s.bankAccountNo = p.bankAccountNo ?? null;
    s.bankAccountName = p.bankAccountName ?? null;
    s.companyName = p.companyName ?? null;
    if (p.bookBankUrl) s.bookBankUrl = p.bookBankUrl;
    if (p.submitForVerify) {
      s.verifyStatus = "pending";
      s.verifyNote = null;
    }
  }
  return true;
}

// admin: อนุมัติ/ปฏิเสธเอกสารยืนยันร้าน
export async function reviewShopVerification(
  sellerId: string,
  approve: boolean,
  note = ""
): Promise<void> {
  const seller = await getSeller(sellerId);
  const patch = {
    verify_status: approve ? "approved" : "rejected",
    company_verified: approve,
    verify_note: approve ? null : note || "เอกสารไม่ผ่าน",
  };
  if (isSupabaseReady()) {
    await sb().from("sellers").update(patch).eq("id", sellerId);
  } else {
    const s = db.sellers.find((x) => x.id === sellerId);
    if (s) {
      s.verifyStatus = approve ? "approved" : "rejected";
      s.companyVerified = approve;
      s.verifyNote = approve ? null : note || "เอกสารไม่ผ่าน";
    }
  }
  await logAdmin(
    approve ? "อนุมัติเอกสารร้าน" : "ปฏิเสธเอกสารร้าน",
    seller?.shopName ?? seller?.displayName ?? sellerId
  );
}

// ร้านที่ยื่นเอกสารรออนุมัติ
export async function getPendingVerifications(): Promise<Seller[]> {
  if (isSupabaseReady()) {
    const { data } = await sb().from("sellers").select("*").eq("verify_status", "pending");
    return (data ?? []).map(rowToSeller);
  }
  return db.sellers.filter((s) => s.verifyStatus === "pending");
}

// ร้านที่ยืนยันแล้ว — บริษัทใช้ตรวจย้อนหลัง/ยกเลิกการยืนยันได้
export async function getVerifiedShops(): Promise<Seller[]> {
  if (isSupabaseReady()) {
    const { data } = await sb().from("sellers").select("*").eq("company_verified", true);
    return (data ?? []).map(rowToSeller);
  }
  return db.sellers.filter((s) => s.companyVerified);
}

// ยกเลิกการยืนยันร้าน → ใช้วิธีรับของแบบโอนก่อนไม่ได้อีก
// ประกาศเดิมที่ตั้งเป็น prepay/shipping ไว้ ให้ย้ายกลับเป็น "นัดรับ" ทันที
// (ไม่งั้นผู้ซื้อจะยังโอนเงินให้ร้านที่ถูกถอนสิทธิ์ได้)
export async function revokeShopVerification(sellerId: string, reason: string): Promise<void> {
  const seller = await getSeller(sellerId);
  const patch = {
    company_verified: false,
    verify_status: "rejected",
    verify_note: reason || "บริษัทยกเลิกการยืนยันร้าน",
  };
  if (isSupabaseReady()) {
    await sb().from("sellers").update(patch).eq("id", sellerId);
    await sb()
      .from("listings")
      .update({ delivery_method: "meetup" })
      .eq("seller_id", sellerId)
      .in("delivery_method", ["prepay", "shipping"]);
  } else {
    const s = db.sellers.find((x) => x.id === sellerId);
    if (s) {
      s.companyVerified = false;
      s.verifyStatus = "rejected";
      s.verifyNote = reason || "บริษัทยกเลิกการยืนยันร้าน";
    }
    db.listings
      .filter((l) => l.sellerId === sellerId && ["prepay", "shipping"].includes(l.deliveryMethod))
      .forEach((l) => (l.deliveryMethod = "meetup"));
  }
  await logAdmin(
    "ยกเลิกการยืนยันร้าน",
    `${seller?.shopName ?? seller?.displayName ?? sellerId}${reason ? ` — ${reason}` : ""}`
  );
}

export async function setSellerCompanyVerified(sellerId: string, verified: boolean): Promise<void> {
  const s = await getSeller(sellerId);
  if (isSupabaseReady()) {
    await sb().from("sellers").update({ company_verified: verified }).eq("id", sellerId);
  } else {
    const local = db.sellers.find((x) => x.id === sellerId);
    if (local) local.companyVerified = verified;
  }
  await logAdmin(verified ? "ยืนยันร้านกับบริษัท" : "ยกเลิกการยืนยันร้าน", s?.displayName ?? sellerId);
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

// -----------------------------------------------------------------------------
// รายการสั่งซื้อ (orders)
// ที่อยู่/เบอร์ผู้ซื้อเป็นข้อมูลส่วนบุคคล → อ่านผ่าน service_role เท่านั้น
// และทุกจุดที่เรียกต้องตรวจสิทธิ์เจ้าของก่อน (ดู actions.ts)
// -----------------------------------------------------------------------------
export interface NewOrderInput {
  listingId: string;
  sellerId: string;
  buyerKey: string;
  buyerName: string;
  buyerPhone: string;
  address: string | null;
  listingTitle: string;
  price: number;
  unit: string;
  qty: number;
  note: string;
  deliveryMethod: DeliveryMethod;
}

export async function createOrder(input: NewOrderInput): Promise<Order | null> {
  if (isSupabaseReady()) {
    const { data, error } = await sb()
      .from("orders")
      .insert({
        listing_id: input.listingId,
        seller_id: input.sellerId,
        buyer_key: input.buyerKey,
        buyer_name: input.buyerName,
        buyer_phone: input.buyerPhone,
        address: input.address,
        listing_title: input.listingTitle,
        price: input.price,
        unit: input.unit,
        qty: input.qty,
        note: input.note || null,
        delivery_method: input.deliveryMethod,
        status: "pending",
      })
      .select("*")
      .single();
    if (error || !data) return null;
    return rowToOrder(data);
  }

  const order: Order = {
    id: `o-${Math.random().toString(36).slice(2, 8)}`,
    listingId: input.listingId,
    sellerId: input.sellerId,
    buyerKey: input.buyerKey,
    buyerName: input.buyerName,
    buyerPhone: input.buyerPhone,
    address: input.address,
    listingTitle: input.listingTitle,
    price: input.price,
    unit: input.unit,
    qty: input.qty,
    note: input.note || null,
    deliveryMethod: input.deliveryMethod,
    status: "pending",
    trackingNo: null,
    carrier: null,
    cancelReason: null,
    createdAt: new Date().toISOString(),
    confirmedAt: null,
  };
  db.orders.unshift(order);
  return order;
}

export async function getSellerOrders(sellerId: string): Promise<Order[]> {
  if (isSupabaseReady()) {
    const { data } = await sb()
      .from("orders")
      .select("*")
      .eq("seller_id", sellerId)
      .order("created_at", { ascending: false });
    return (data ?? []).map(rowToOrder);
  }
  return db.orders.filter((o) => o.sellerId === sellerId);
}

export async function getBuyerOrders(buyerKey: string): Promise<Order[]> {
  if (isSupabaseReady()) {
    const { data } = await sb()
      .from("orders")
      .select("*")
      .eq("buyer_key", buyerKey)
      .order("created_at", { ascending: false });
    return (data ?? []).map(rowToOrder);
  }
  return db.orders.filter((o) => o.buyerKey === buyerKey);
}

export async function getOrder(id: string): Promise<Order | undefined> {
  if (isSupabaseReady()) {
    const { data } = await sb().from("orders").select("*").eq("id", id).maybeSingle();
    return data ? rowToOrder(data) : undefined;
  }
  return db.orders.find((o) => o.id === id);
}

// ที่อยู่/เบอร์ล่าสุดของผู้ซื้อ — ใช้เติมฟอร์มให้อัตโนมัติ (ไม่ต้องพิมพ์ซ้ำทุกครั้ง)
export async function getLastBuyerInfo(
  buyerKey: string
): Promise<{ name: string; phone: string; address: string } | null> {
  const orders = await getBuyerOrders(buyerKey);
  const last = orders[0];
  if (!last) return null;
  return { name: last.buyerName, phone: last.buyerPhone, address: last.address ?? "" };
}

export async function updateOrder(
  id: string,
  patch: Partial<{
    status: Order["status"];
    trackingNo: string | null;
    carrier: string | null;
    cancelReason: string | null;
    confirmedAt: string | null;
  }>
): Promise<void> {
  if (isSupabaseReady()) {
    const row: Record<string, unknown> = {};
    if (patch.status !== undefined) row.status = patch.status;
    if (patch.trackingNo !== undefined) row.tracking_no = patch.trackingNo;
    if (patch.carrier !== undefined) row.carrier = patch.carrier;
    if (patch.cancelReason !== undefined) row.cancel_reason = patch.cancelReason;
    if (patch.confirmedAt !== undefined) row.confirmed_at = patch.confirmedAt;
    await sb().from("orders").update(row).eq("id", id);
    return;
  }
  const o = db.orders.find((x) => x.id === id);
  if (o) Object.assign(o, patch);
}

export async function countPendingOrders(sellerId: string): Promise<number> {
  if (isSupabaseReady()) {
    const { count } = await sb()
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("seller_id", sellerId)
      .eq("status", "pending");
    return count ?? 0;
  }
  return db.orders.filter((o) => o.sellerId === sellerId && o.status === "pending").length;
}
