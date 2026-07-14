import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Supabase server client — ใช้เมื่อกรอก env NEXT_PUBLIC_SUPABASE_URL / ANON_KEY
// ปัจจุบัน MVP ใช้ in-memory store (@/lib/data). ไฟล์นี้พร้อมสำหรับต่อ Supabase จริง
export async function createSupabaseServer() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;

  const jar = await cookies();
  return createServerClient(url, key, {
    cookies: {
      getAll: () => jar.getAll(),
      setAll: (
        list: { name: string; value: string; options?: Record<string, unknown> }[]
      ) => {
        try {
          list.forEach(({ name, value, options }) =>
            jar.set(name, value, options as Parameters<typeof jar.set>[2])
          );
        } catch {
          // called from a Server Component — ignore
        }
      },
    },
  });
}

export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}
