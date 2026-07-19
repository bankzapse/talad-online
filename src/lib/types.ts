// โดเมนหลักของเว็บตลาดออนไลน์ — ตรงกับแผนใน MVP-แผนเว็บตลาด-FINAL.md

export type Unit =
  | "บาท/กก."
  | "ชิ้น"
  | "มัด"
  | "ตัว"
  | "กำ"
  | "ถุง"
  | "กล่อง"
  | "โหล";

export const UNITS: Unit[] = [
  "บาท/กก.",
  "ชิ้น",
  "มัด",
  "ตัว",
  "กำ",
  "ถุง",
  "กล่อง",
  "โหล",
];

export type ListingStatus = "draft" | "pending_review" | "active" | "sold" | "hidden";

// ประกาศต้องผ่านการอนุมัติจากทีมงานก่อนแสดงต่อผู้ซื้อ
// draft (ร่าง) → pending_review (ส่งขออนุมัติ) → active (อนุมัติแล้ว)
export const LISTING_STATUS: Record<ListingStatus, { text: string; cls: string }> = {
  draft: { text: "ฉบับร่าง — ยังไม่ส่งขออนุมัติ", cls: "border-slate-200 bg-slate-50 text-slate-500" },
  pending_review: { text: "รอทีมงานอนุมัติ", cls: "border-amber-200 bg-amber-50 text-amber-600" },
  active: { text: "แสดงอยู่", cls: "border-brand/30 bg-brand-light text-brand-dark" },
  sold: { text: "ขายแล้ว", cls: "border-slate-200 bg-slate-50 text-slate-500" },
  hidden: { text: "ซ่อน/ถูกระงับ", cls: "border-red-200 bg-red-50 text-red-600" },
};

export type VerifyStatus = "none" | "pending" | "approved" | "rejected";

export const VERIFY_LABEL: Record<VerifyStatus, { text: string; cls: string }> = {
  none: { text: "ยังไม่ยื่นเอกสาร", cls: "border-slate-200 bg-slate-50 text-slate-500" },
  pending: { text: "รอบริษัทอนุมัติ", cls: "border-amber-200 bg-amber-50 text-amber-600" },
  approved: { text: "อนุมัติแล้ว", cls: "border-gold/40 bg-gold-light text-[#7a5c1f]" },
  rejected: { text: "ไม่ผ่าน — แก้ไขแล้วยื่นใหม่", cls: "border-red-200 bg-red-50 text-red-600" },
};

export type DeliveryMethod = "meetup" | "cod" | "shipping" | "prepay";

export const DELIVERY_METHODS: {
  value: DeliveryMethod;
  label: string;
  short: string;
  requiresCompanyVerified?: boolean;
}[] = [
  { value: "meetup", label: "นัดรับเอง — จ่ายเงินสดตอนรับของ", short: "นัดรับ" },
  { value: "cod", label: "ส่งพัสดุเก็บเงินปลายทาง (COD)", short: "COD" },
  {
    value: "shipping",
    label: "ส่งพัสดุ — โอนก่อนส่ง (เฉพาะร้านที่ยืนยันกับบริษัท)",
    short: "ส่งพัสดุ",
    requiresCompanyVerified: true,
  },
  {
    value: "prepay",
    label: "โอนเงินก่อนรับสินค้า (เฉพาะร้านที่ยืนยันกับบริษัท)",
    short: "โอนก่อน",
    requiresCompanyVerified: true,
  },
];

export const MAX_LISTING_IMAGES = 10;

// ทุกวิธีที่ไม่ใช่ "นัดรับ" ต้องส่งของ → ต้องมีที่อยู่ผู้ซื้อ + เลขพัสดุตอนส่ง
export function needsShipping(m: DeliveryMethod): boolean {
  return m !== "meetup";
}

export interface Category {
  id: string;
  name: string;
  emoji: string;
  sortOrder: number;
}

export interface Area {
  id: string;
  province: string;
  market: string; // ชื่อตลาด
}

export interface Seller {
  id: string;
  displayName: string;
  phone: string | null;
  phoneVerified: boolean;
  joinedAt: string; // ISO
  membershipExpiresAt: string | null; // ISO — null = ยังไม่เคยมีสมาชิก/หมดสิทธิ์
  trialUsed: boolean;
  blocked: boolean;
  companyVerified: boolean; // ยืนยันตัวตนกับบริษัทแล้ว → ใช้วิธีรับของแบบโอนก่อนได้
  shopName: string | null; // ต้องกรอกก่อนลงประกาศ
  shopAbout: string | null;
  contactPhone: string | null; // เบอร์ติดต่อร้าน (บังคับ)
  lineId: string | null; // LINE ID ที่ผู้ซื้อใช้ทัก (เช่น @taladshop) — ร้านกรอกเอง
  bankName: string | null;
  bankAccountNo: string | null;
  bankAccountName: string | null;
  companyName: string | null;
  bookBankUrl: string | null; // path เอกสารใน bucket docs (private)
  verifyStatus: VerifyStatus;
  verifyNote: string | null;
  lineUserId?: string;
}

export interface Listing {
  id: string;
  sellerId: string;
  title: string;
  description: string;
  price: number;
  unit: Unit;
  categoryId: string;
  areaId?: string | null; // เดิม (เลิกใช้) — เก็บไว้เผื่อข้อมูลเก่า
  province: string;
  district: string;
  subdistrict: string;
  marketName: string;
  images: string[];
  status: ListingStatus;
  deliveryMethod: DeliveryMethod;
  createdAt: string;
  reportCount: number;
  flaggedKeywords: string[]; // คำที่ติด blocklist → เข้าคิว admin
  reviewNote: string | null; // เหตุผลที่ทีมงานไม่อนุมัติ
}

export interface MembershipPackage {
  id: string;
  name: string;
  days: number;
  price: number;
  active: boolean;
}

export type PaymentStatus = "pending" | "verified" | "rejected";

export interface Payment {
  id: string;
  sellerId: string;
  packageId: string;
  amount: number;
  slipUrl: string | null;
  status: PaymentStatus;
  createdAt: string;
  verifiedAt: string | null;
  note?: string;
}

// ---------- รายการสั่งซื้อ ----------
export type OrderStatus = "pending" | "confirmed" | "shipped" | "completed" | "cancelled";

export const ORDER_STATUS: Record<OrderStatus, { text: string; cls: string }> = {
  pending: { text: "รอร้านยืนยัน", cls: "border-amber-200 bg-amber-50 text-amber-600" },
  confirmed: { text: "ร้านยืนยันแล้ว", cls: "border-brand/30 bg-brand-light text-brand-dark" },
  shipped: { text: "จัดส่งแล้ว", cls: "border-blue-200 bg-blue-50 text-blue-600" },
  completed: { text: "สำเร็จ", cls: "border-slate-200 bg-slate-50 text-slate-500" },
  cancelled: { text: "ยกเลิก", cls: "border-red-200 bg-red-50 text-red-600" },
};

export interface Order {
  id: string;
  listingId: string | null;
  sellerId: string;
  buyerKey: string;
  buyerName: string;
  buyerPhone: string;
  address: string | null; // นัดรับ = null
  listingTitle: string; // snapshot กันประกาศถูกแก้/ลบ
  price: number;
  unit: string | null;
  qty: number;
  note: string | null;
  deliveryMethod: DeliveryMethod;
  status: OrderStatus;
  trackingNo: string | null;
  carrier: string | null;
  cancelReason: string | null;
  createdAt: string;
  confirmedAt: string | null;
}

export interface Report {
  id: string;
  listingId: string;
  reason: string;
  createdAt: string;
}

export interface AdminLog {
  id: string;
  action: string;
  detail: string;
  createdAt: string;
}
