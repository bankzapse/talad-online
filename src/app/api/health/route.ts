import { NextResponse } from "next/server";
import { getServiceClient, isSupabaseReady } from "@/lib/supabase/admin";

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

  return NextResponse.json(
    { status: ok ? "ok" : "degraded", checks },
    { status: ok ? 200 : 503 }
  );
}
