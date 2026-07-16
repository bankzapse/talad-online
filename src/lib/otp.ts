// -----------------------------------------------------------------------------
// OTP ยืนยันเบอร์ — มี dev-mode ทำงานได้ก่อนเชื่อม SMS provider จริง
// เมื่อกรอก OTP_API_KEY + OTP_SENDER → ส่ง SMS จริง (จุดเชื่อมด้านล่าง)
// -----------------------------------------------------------------------------

export function isOtpConfigured(): boolean {
  return Boolean(process.env.OTP_API_KEY && process.env.OTP_SENDER);
}

export function normalizePhone(raw: string): string {
  return raw.replace(/[^0-9]/g, "");
}

export function isValidThaiMobile(phone: string): boolean {
  const n = normalizePhone(phone);
  return /^0[689]\d{8}$/.test(n); // 08x/09x/06x, 10 หลัก
}

// ส่ง OTP — โหมด dev: ไม่ส่งจริง (คืน devMode)
// เมื่อเชื่อม provider: เรียก API ส่ง SMS ที่นี่
export async function sendOtp(phone: string): Promise<{ sent: boolean; devMode: boolean }> {
  if (!isOtpConfigured()) return { sent: false, devMode: true };
  // TODO: เรียก provider จริง เช่น ThaiBulkSMS — ส่งรหัส 6 หลักไปที่ phone
  // await fetch(process.env.OTP_ENDPOINT, {...})
  void phone;
  return { sent: true, devMode: false };
}

// ตรวจรหัส — โหมด dev: ผ่านทันที (ยังไม่มี provider)
export async function verifyOtp(phone: string, code: string): Promise<boolean> {
  if (!isOtpConfigured()) return true; // dev-mode
  // TODO: ตรวจรหัสกับ provider จริง
  void phone;
  void code;
  return false;
}
