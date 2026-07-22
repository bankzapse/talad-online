// ค่าเริ่มต้นของการแจ้งเตือน — แยกไฟล์เพื่อตัดวงจร import ระหว่าง data.ts กับ notify.ts
//
// เกณฑ์: ไม่ส่งแล้วผู้รับเสียหาย/ต้องรีบทำอะไร → เปิด · เข้าเว็บดูเองได้ → ปิด
export const NOTIFY_DEFAULT: Record<string, boolean> = {
  order_new: true,
  order_confirmed: true,
  order_shipped: true,
  order_cancelled: true,
  listing_approved: false,
  listing_rejected: true,
};
