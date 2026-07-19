import { NextResponse } from "next/server";
import { getServiceClient, isSupabaseReady } from "@/lib/supabase/admin";
import { getCurrentSeller } from "@/lib/auth";

// อัปเอกสารยืนยันร้าน (หน้าสมุดบัญชี) → bucket "docs" แบบ private
// เก็บเป็น path เท่านั้น · admin ดูผ่าน signed URL
export async function POST(req: Request) {
  const seller = await getCurrentSeller();
  if (!seller) return NextResponse.json({ error: "login_required" }, { status: 401 });
  if (!isSupabaseReady())
    return NextResponse.json({ error: "storage_unconfigured" }, { status: 501 });

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "no_file" }, { status: 400 });
  if (!file.type.startsWith("image/") && file.type !== "application/pdf")
    return NextResponse.json({ error: "bad_type" }, { status: 415 });
  if (file.size > 8 * 1024 * 1024)
    return NextResponse.json({ error: "too_large" }, { status: 413 });

  const sb = getServiceClient()!;
  const ext = file.name.split(".").pop() || "jpg";
  const path = `${seller.id}/bookbank-${Date.now()}.${ext}`;

  // สร้าง bucket ถ้ายังไม่มี (private)
  const { data: buckets } = await sb.storage.listBuckets();
  if (!(buckets ?? []).some((b) => b.id === "docs")) {
    await sb.storage.createBucket("docs", { public: false });
  }

  const { error } = await sb.storage
    .from("docs")
    .upload(path, file, { contentType: file.type, upsert: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // คืนเฉพาะ path (ไม่ใช่ URL สาธารณะ)
  return NextResponse.json({ path });
}
