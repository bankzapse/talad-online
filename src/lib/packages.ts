import type { MembershipPackage } from "./types";

// แพ็กสมาชิกเริ่มต้น (แก้ราคา/เปิด-ปิดได้จากหน้า admin)
export const DEFAULT_PACKAGES: MembershipPackage[] = [
  { id: "pkg-7d", name: "7 วัน", days: 7, price: 39, active: true },
  { id: "pkg-1m", name: "รายเดือน", days: 30, price: 99, active: true },
  { id: "pkg-3m", name: "3 เดือน", days: 90, price: 279, active: true },
  { id: "pkg-6m", name: "6 เดือน", days: 180, price: 539, active: true },
  { id: "pkg-1y", name: "รายปี", days: 365, price: 999, active: true },
];

export const TRIAL_DAYS = 7;
