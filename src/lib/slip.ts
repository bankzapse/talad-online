import { getServiceClient, isSupabaseReady } from "./supabase/admin";

// -----------------------------------------------------------------------------
// จัดการสลิปการชำระเงิน — เก็บใน bucket "slips" (private) + สร้าง signed URL ให้ admin ดู
// รองรับต่อ API ตรวจสลิปอัตโนมัติ (SlipOK/slip2go) เมื่อกรอก SLIP_VERIFY_* — ดู verifySlip()
// -----------------------------------------------------------------------------

const BUCKET = "slips";

export async function ensureSlipBucket(): Promise<void> {
  const sb = getServiceClient();
  if (!sb) return;
  const { data } = await sb.storage.listBuckets();
  if (!(data ?? []).some((b) => b.id === BUCKET)) {
    await sb.storage.createBucket(BUCKET, { public: false });
  }
}

export async function signSlipUrl(path: string | null): Promise<string | null> {
  if (!path || !isSupabaseReady()) return null;
  const sb = getServiceClient()!;
  const { data } = await sb.storage.from(BUCKET).createSignedUrl(path, 60 * 30);
  return data?.signedUrl ?? null;
}

export function slipBucketName() {
  return BUCKET;
}

// (ทางเลือก) ตรวจสลิปอัตโนมัติกับผู้ให้บริการไทย เมื่อกรอก env
// endpoint/รูปแบบ body ต่างกันตามเจ้า (SlipOK/slip2go/EasySlip) — ปรับตาม provider ที่เลือก
export async function verifySlipAmount(
  slipRef: string,
  expectedAmount: number
): Promise<{ verified: boolean; amount?: number } | null> {
  const endpoint = process.env.SLIP_VERIFY_ENDPOINT;
  const apiKey = process.env.SLIP_VERIFY_API_KEY;
  if (!endpoint || !apiKey) return null; // ยังไม่ตั้งค่า → ให้ admin ตรวจมือ

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ data: slipRef }),
    });
    if (!res.ok) return { verified: false };
    const json = await res.json();
    // สมมติ response มี field amount — ปรับ mapping ตาม provider จริง
    const amount = Number(json.amount ?? json?.data?.amount ?? 0);
    return { verified: amount >= expectedAmount, amount };
  } catch {
    return { verified: false };
  }
}
