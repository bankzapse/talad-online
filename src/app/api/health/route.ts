import { NextResponse } from "next/server";
import { getServiceClient, isSupabaseReady } from "@/lib/supabase/admin";
import { getLineStatus } from "@/lib/line";

// Health check — ชี้ uptime monitor (UptimeRobot ฯลฯ) มาที่นี่ได้เลย ไม่ต้องมีบัญชี
export const dynamic = "force-dynamic";

export async function GET() {
  const checks: Record<string, string> = { app: "ok" };
  let ok = true;

  if (isSupabaseReady()) {
    try {
      const { error } = await getServiceClient()!
        .from("categories")
        .select("id", { count: "exact", head: true });
      checks.database = error ? "error" : "ok";
      if (error) ok = false;
    } catch {
      checks.database = "error";
      ok = false;
    }
  } else {
    checks.database = "demo";
  }

  checks.line = process.env.LINE_LOGIN_CHANNEL_ID ? "configured" : "not_configured";

  // แจ้งเตือน LINE — ยิง /v2/bot/info จริงเพื่อยืนยันว่า token ยังใช้ได้
  // (ไม่คืนชื่อ OA หรือตัวเลขโควตา — ดูรายละเอียดได้ที่ /admin/line)
  const line = await getLineStatus();
  checks.lineNotify = !line.configured
    ? "not_configured"
    : line.tokenValid
    ? "ok"
    : "invalid_token";

  return NextResponse.json(
    { status: ok ? "ok" : "degraded", checks },
    { status: ok ? 200 : 503 }
  );
}
