import { pushToLineUser, type PushResult } from "./line";

// -----------------------------------------------------------------------------
// แจ้งเตือน LINE — คุมจากที่เดียว
//
// แพ็กฟรีของ LINE OA ให้ 300 ข้อความ/เดือน ยิ่งส่งหลายจังหวะ ยิ่งรองรับออร์เดอร์ได้น้อย
// ตารางนี้คือสวิตช์ — ปิดจังหวะไหนก็แค่เปลี่ยนเป็น false ไม่ต้องไล่แก้ในโค้ด
//
// เกณฑ์ที่ใช้ตัดสิน: "ถ้าไม่ส่ง ผู้รับจะเสียหายหรือพลาดอะไรไหม"
//   • เสียหาย/ต้องรีบทำอะไร → เปิด
//   • เข้าเว็บดูเองได้ ไม่เร่งด่วน → ปิด
// -----------------------------------------------------------------------------

export type NotifyEvent =
  | "order_new" // ผู้ซื้อสั่ง → ร้าน: ร้านต้องรีบเตรียมของ ไม่ส่งคือพลาดออร์เดอร์
  | "order_confirmed" // ร้านยืนยัน → ผู้ซื้อ: ดูเองได้ที่หน้าคำสั่งซื้อ
  | "order_shipped" // ร้านส่งของ → ผู้ซื้อ: มีเลขพัสดุ ต้องใช้ติดตาม
  | "order_cancelled" // ยกเลิก → อีกฝ่าย: กระทบเงิน/ของ ต้องรู้ทันที
  | "listing_approved" // อนุมัติประกาศ → ร้าน: ดูสถานะเองได้ที่ร้านของฉัน
  | "listing_rejected"; // ตีกลับ/ระงับ → ร้าน: ต้องแก้ไข ไม่ส่งก็ไม่รู้ว่าต้องทำอะไร

export const NOTIFY: Record<NotifyEvent, boolean> = {
  order_new: true,
  order_confirmed: false, // ปิด — ประหยัดโควตา ผู้ซื้อดูสถานะที่ /orders ได้
  order_shipped: true,
  order_cancelled: true,
  listing_approved: false, // ปิด — ประกาศขึ้นเว็บเองอยู่แล้ว ไม่เร่งด่วน
  listing_rejected: true,
};

// ส่งเฉพาะจังหวะที่เปิดไว้ — จังหวะที่ปิดจะข้ามไปเงียบ ๆ ไม่เปลืองโควตา
export async function notify(
  event: NotifyEvent,
  lineUserId: string | undefined,
  message: string,
  label = "?"
): Promise<PushResult | "skipped"> {
  if (!NOTIFY[event]) return "skipped";
  return pushToLineUser(lineUserId, message, label);
}
