import { NextResponse } from "next/server";
import { getServiceClient, isSupabaseReady } from "@/lib/supabase/admin";
import { getCurrentSeller } from "@/lib/auth";
import { ensureSlipBucket, slipBucketName } from "@/lib/slip";

// อัปโหลดสลิปการชำระเงิน → bucket "slips" (private) → คืน path (ไม่ใช่ public URL)
export async function POST(req: Request) {
  const seller = await getCurrentSeller();
  if (!seller) return NextResponse.json({ error: "login_required" }, { status: 401 });
  if (!isSupabaseReady()) {
    return NextResponse.json({ error: "storage_unconfigured" }, { status: 501 });
  }

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "no_file" }, { status: 400 });
  if (!file.type.startsWith("image/"))
    return NextResponse.json({ error: "not_image" }, { status: 415 });
  if (file.size > 5 * 1024 * 1024)
    return NextResponse.json({ error: "too_large" }, { status: 413 });

  await ensureSlipBucket();
  const ext = file.name.split(".").pop() || "jpg";
  const path = `${seller.id}/${Math.random().toString(36).slice(2)}.${ext}`;
  const sb = getServiceClient()!;
  const { error } = await sb.storage
    .from(slipBucketName())
    .upload(path, file, { contentType: file.type });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ path });
}
