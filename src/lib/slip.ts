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

// -----------------------------------------------------------------------------
// ตรวจสลิปอัตโนมัติกับผู้ให้บริการไทย — ดึงไฟล์สลิปจาก storage แล้วส่งให้ provider
// รองรับ SlipOK / EasySlip / custom  (เลือกด้วย SLIP_VERIFY_PROVIDER)
//   SLIP_VERIFY_PROVIDER = slipok | easyslip | custom   (ค่าเริ่มต้น: slipok)
//   SLIP_VERIFY_API_KEY  = api key/token ของ provider
//   SLIP_VERIFY_ENDPOINT = URL (จำเป็นสำหรับ slipok/custom, easyslip มี default)
// ยอดต้องตรง "เป๊ะ" รวมเลขลงท้าย (สตางค์) ที่ใช้เป็นรหัสอ้างอิง
// -----------------------------------------------------------------------------

async function downloadSlip(path: string): Promise<Blob | null> {
  if (!isSupabaseReady()) return null;
  const sb = getServiceClient()!;
  const { data, error } = await sb.storage.from(BUCKET).download(path);
  if (error || !data) return null;
  return data;
}

function extractAmount(provider: string, json: Record<string, unknown>): number {
  const d = (json.data ?? json) as Record<string, unknown>;
  if (provider === "easyslip") {
    // { data: { amount: { amount: 99.37 } } }
    const amt = d.amount as Record<string, unknown> | number | undefined;
    if (typeof amt === "object" && amt !== null) return Number(amt.amount ?? 0);
    return Number(amt ?? 0);
  }
  // slipok/custom: { data: { amount: 99.37 } }
  return Number(d.amount ?? 0);
}

export async function verifySlipAmount(
  slipPath: string,
  expectedAmount: number
): Promise<{ verified: boolean; amount?: number } | null> {
  const apiKey = process.env.SLIP_VERIFY_API_KEY;
  if (!apiKey) return null; // ยังไม่ตั้งค่า → ให้ admin ตรวจมือ

  const provider = (process.env.SLIP_VERIFY_PROVIDER || "slipok").toLowerCase();
  const endpoint =
    process.env.SLIP_VERIFY_ENDPOINT ||
    (provider === "easyslip" ? "https://developer.easyslip.com/api/v1/verify" : "");
  if (!endpoint) return null;

  const blob = await downloadSlip(slipPath);
  if (!blob) return { verified: false };

  try {
    const form = new FormData();
    // ชื่อ field ต่างกันตาม provider
    form.append(provider === "easyslip" ? "file" : "files", blob, "slip.jpg");

    const headers: Record<string, string> =
      provider === "slipok"
        ? { "x-authorization": apiKey }
        : { authorization: `Bearer ${apiKey}` };

    const res = await fetch(endpoint, { method: "POST", headers, body: form });
    if (!res.ok) return { verified: false };

    const json = (await res.json()) as Record<string, unknown>;
    const amount = extractAmount(provider, json);
    // ต้องตรงเป๊ะระดับสตางค์ (กันยอดชน + กันจ่ายขาด)
    const verified = amount > 0 && Math.abs(amount - expectedAmount) < 0.005;
    return { verified, amount };
  } catch {
    return { verified: false };
  }
}
