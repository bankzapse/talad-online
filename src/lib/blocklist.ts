// Keyword blocklist — จากไฟล์ "รายการของต้องห้าม"
// หลักการ: ไม่บล็อกทันที แต่ "flag เข้าคิว admin" กัน false positive

export const BLOCKLIST: string[] = [
  // กลุ่ม 1 — ผิดกฎหมายชัด
  "ยาบ้า", "ไอซ์", "ยาเค", "โคเคน", "ยาอี", "เฮโรอีน",
  "ปืน", "กระสุน", "อาวุธ", "ระเบิด", "bb gun",
  // กลุ่ม 2 — ต้องใบอนุญาต
  "บุหรี่ไฟฟ้า", "พอต", "เหล้า", "เบียร์", "ไวน์", "วอดก้า",
  // กลุ่ม 3 — สัตว์คุ้มครอง
  "งาช้าง", "นอแรด", "สัตว์ป่า",
  // กลุ่ม 5 — การเงิน/ข้อมูล
  "บัตรเครดิต", "เลขบัตร", "สลิปปลอม", "เงินกู้", "ปล่อยกู้", "แชร์ลูกโซ่",
  // กลุ่ม 1 — บริการทางเพศ
  "ขายตัว",
];

export interface BlocklistResult {
  hit: boolean;
  matched: string[];
}

export function checkBlocklist(...texts: string[]): BlocklistResult {
  const haystack = texts.join(" ").toLowerCase();
  const matched = BLOCKLIST.filter((w) => haystack.includes(w.toLowerCase()));
  return { hit: matched.length > 0, matched };
}
