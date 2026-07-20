import type { Unit } from "./types";

// แสดงราคาพร้อมหน่วยชัดเจน กันการเทียบข้ามหน่วย (กติกาสำคัญในแผน)
// หน่วยที่ขึ้นต้นด้วย "บาท/" เป็นหน่วยราคาอยู่แล้ว (เช่น บาท/500 ก.)
// ต่อท้ายตรง ๆ จะได้ "250 ฿ / บาท/500 ก." — ต้องตัดคำว่า "บาท" ออกก่อน
export function formatPrice(price: number, unit: Unit): string {
  const n = new Intl.NumberFormat("th-TH").format(price);
  if (unit.startsWith("บาท/")) return `${n} ฿/${unit.slice(4)}`;
  return `${n} ฿ / ${unit}`;
}

// หน่วยสำหรับ "นับจำนวน" — ต่างจากหน่วยราคา
// unit ของสินค้าชั่งกิโลคือ "บาท/กก." ซึ่งเป็นหน่วยราคา เอามาต่อท้ายจำนวนตรง ๆ
// จะได้ "เหลือ 2 บาท/กก." ที่อ่านไม่รู้เรื่อง — ต้องตัดส่วนราคาออกเหลือแค่ "กก."
export function countUnit(unit: Unit | string): string {
  const u = String(unit);
  const i = u.indexOf("/");
  return i >= 0 ? u.slice(i + 1) : u;
}

export function formatStock(stock: number, unit: Unit | string): string {
  const n = new Intl.NumberFormat("th-TH").format(stock);
  const cu = countUnit(unit);
  // หน่วยที่ขึ้นต้นด้วยตัวเลข (100 ก.) ต้องมี × คั่น ไม่งั้นอ่านเป็น "เหลือ 3 100 ก."
  return /^\d/.test(cu) ? `เหลือ ${n} × ${cu}` : `เหลือ ${n} ${cu}`;
}

export function formatBaht(n: number): string {
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    maximumFractionDigits: 0,
  }).format(n);
}

// แสดงทศนิยม (เลขลงท้าย/สตางค์) เมื่อยอดไม่เต็มบาท — ใช้กับยอดที่ต้องจับคู่สลิป
export function formatBahtExact(n: number): string {
  const hasDecimals = Math.round(n * 100) % 100 !== 0;
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    minimumFractionDigits: hasDecimals ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(n);
}

// "เข้าร่วมเมื่อ" — แปลงเป็นข้อความไทยแบบสั้น
export function joinedLabel(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("th-TH", {
    year: "numeric",
    month: "short",
  });
}

export function daysLeft(iso: string | null): number | null {
  if (!iso) return null;
  const ms = new Date(iso).getTime() - Date.now();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "เมื่อสักครู่";
  if (mins < 60) return `${mins} นาทีที่แล้ว`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} ชม.ที่แล้ว`;
  const days = Math.floor(hrs / 24);
  return `${days} วันที่แล้ว`;
}
