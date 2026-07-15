import QRCode from "qrcode";

// -----------------------------------------------------------------------------
// สร้าง PromptPay QR payload (มาตรฐาน EMVCo / Thai QR Payment)
// รองรับเบอร์มือถือ / เลขบัตรประชาชน / เลข e-wallet + ใส่ยอดเงินได้
// -----------------------------------------------------------------------------

function f(id: string, value: string): string {
  return id + String(value.length).padStart(2, "0") + value;
}

function crc16(data: string): string {
  let crc = 0xffff;
  for (let i = 0; i < data.length; i++) {
    crc ^= data.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
      crc &= 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

function formatTarget(id: string): string {
  const n = id.replace(/[^0-9]/g, "");
  if (n.length >= 13) return n; // เลขบัตร/e-wallet
  return ("0000000000000" + n.replace(/^0/, "66")).slice(-13); // เบอร์มือถือ
}

export function promptPayPayload(id: string, amount?: number): string {
  const sanitized = id.replace(/[^0-9]/g, "");
  const type = sanitized.length >= 13 ? "02" : "01"; // 01=มือถือ, 02=บัตรปชช.
  const merchant = f("00", "A000000677010111") + f(type, formatTarget(id));

  let payload =
    f("00", "01") +
    f("01", amount ? "12" : "11") +
    f("29", merchant) +
    f("53", "764") + // THB
    (amount ? f("54", amount.toFixed(2)) : "") +
    f("58", "TH");
  payload += "6304";
  return payload + crc16(payload);
}

// คืน QR เป็น data URL (PNG) ให้ใช้กับ <img src=...>
export async function promptPayQrDataUrl(id: string, amount?: number): Promise<string | null> {
  if (!id) return null;
  try {
    const payload = promptPayPayload(id, amount);
    return await QRCode.toDataURL(payload, { margin: 1, width: 240 });
  } catch {
    return null;
  }
}
