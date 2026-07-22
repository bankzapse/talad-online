// -----------------------------------------------------------------------------
// LIFF — ทางลัดล็อกอินตอนเปิดจากในแอป LINE
//
// LIFF app 2 ตัวอยู่ใต้ Login channel เดียวกัน → userId ที่ได้เป็นตัวเดียวกับ
// OAuth ปกติ เลยได้ cookie หน้าตาเดิม ไม่ต้องแก้อะไรที่เหลือในระบบ
//
// LIFF ID ไม่ใช่ความลับ (ฝังใน JS ฝั่งเบราว์เซอร์อยู่แล้ว) จึงเป็น NEXT_PUBLIC_
// ไม่ตั้งค่าก็ไม่พัง — หน้า /liff จะถอยไปใช้ OAuth ปกติแทน
// -----------------------------------------------------------------------------

export const LIFF_ROLES = ["seller", "buyer"] as const;
export type LiffRole = (typeof LIFF_ROLES)[number];

export function isLiffRole(v: string): v is LiffRole {
  return (LIFF_ROLES as readonly string[]).includes(v);
}

// ปลายทางเริ่มต้นของแต่ละบทบาท เมื่อไม่ได้ระบุ ?next=
export const LIFF_HOME: Record<LiffRole, string> = {
  seller: "/sell",
  buyer: "/",
};
