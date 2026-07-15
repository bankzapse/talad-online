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

export type ListingStatus = "active" | "sold" | "hidden" | "pending_review";

export interface Category {
  id: string;
  name: string;
  emoji: string;
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
  areaId: string;
  images: string[];
  status: ListingStatus;
  createdAt: string;
  reportCount: number;
  flaggedKeywords: string[]; // คำที่ติด blocklist → เข้าคิว admin
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
