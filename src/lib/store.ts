import type {
  Listing,
  Seller,
  MembershipPackage,
  Payment,
  Report,
  AdminLog,
} from "./types";
import { CATEGORIES, AREAS, SELLERS, LISTINGS } from "./demo-data";
import { DEFAULT_PACKAGES } from "./packages";

// -----------------------------------------------------------------------------
// In-memory store สำหรับ MVP demo
// เมื่อเชื่อม Supabase จริง ให้แทนที่ฟังก์ชันในไฟล์นี้ด้วย query ผ่าน @/lib/supabase
// (โครง type เหมือนกัน จึงสลับได้โดยไม่แตะ UI)  ดู supabase/schema.sql
// หมายเหตุ: บน serverless การเขียนจะไม่คงอยู่ข้าม request — ใช้สำหรับ demo เท่านั้น
// -----------------------------------------------------------------------------

interface DB {
  categories: typeof CATEGORIES;
  areas: typeof AREAS;
  sellers: Seller[];
  listings: Listing[];
  packages: MembershipPackage[];
  payments: Payment[];
  reports: Report[];
  adminLogs: AdminLog[];
  // analytics + rate-limit
  contactEvents: { listingId: string; key: string; at: number }[];
  counters: { listingsCreated: number; contactClicked: number; trialStarted: number; paymentSuccess: number };
  settings: Record<string, Record<string, unknown>>;
}

declare global {
  // eslint-disable-next-line no-var
  var __TALAD_DB__: DB | undefined;
}

function seed(): DB {
  return {
    categories: structuredClone(CATEGORIES),
    areas: structuredClone(AREAS),
    sellers: structuredClone(SELLERS),
    listings: structuredClone(LISTINGS),
    packages: structuredClone(DEFAULT_PACKAGES),
    payments: [],
    reports: [],
    adminLogs: [],
    contactEvents: [],
    counters: {
      listingsCreated: LISTINGS.length,
      contactClicked: 128,
      trialStarted: SELLERS.length,
      paymentSuccess: 2,
    },
    settings: {},
  };
}

export const db: DB = globalThis.__TALAD_DB__ ?? (globalThis.__TALAD_DB__ = seed());
