import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// -----------------------------------------------------------------------------
// Supabase service-role client (server เท่านั้น — bypass RLS)
// ใช้สำหรับ logic ฝั่ง server ที่เชื่อถือได้ (แอปบังคับ authz เอง)
// RLS ใน schema.sql ยังคุ้มครองการเข้าถึงตรงจาก client (anon key) อยู่
// -----------------------------------------------------------------------------

let cached: SupabaseClient | null = null;

export function getServiceClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  if (cached) return cached;
  cached = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}

export function isSupabaseReady(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}
