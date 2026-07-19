import { createHash } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getServiceClient, isSupabaseReady } from "./supabase/admin";
import { db } from "./store";
import { ADMIN_COOKIE } from "./auth";

// -----------------------------------------------------------------------------
// รหัสผ่าน admin — เก็บเป็น hash ใน DB (ตาราง settings key='admin')
// เปลี่ยนได้จากหน้า /admin/settings โดยไม่ต้อง redeploy
// ถ้ายังไม่เคยตั้งใน DB → fallback ใช้ ADMIN_KEY จาก env (ของเดิม)
// -----------------------------------------------------------------------------

export function hashPassword(pw: string): string {
  return createHash("sha256").update(`talad-online:${pw}`).digest("hex");
}

export async function getAdminHash(): Promise<string | null> {
  if (isSupabaseReady()) {
    try {
      const { data } = await getServiceClient()!
        .from("settings")
        .select("value")
        .eq("key", "admin")
        .maybeSingle();
      const v = data?.value as { passwordHash?: string } | undefined;
      if (v?.passwordHash) return v.passwordHash;
    } catch {
      // ตาราง settings ยังไม่มี → ใช้ env
    }
    return null;
  }
  const v = db.settings["admin"] as { passwordHash?: string } | undefined;
  return v?.passwordHash ?? null;
}

export async function setAdminPassword(pw: string): Promise<boolean> {
  const passwordHash = hashPassword(pw);
  if (isSupabaseReady()) {
    const { error } = await getServiceClient()!
      .from("settings")
      .upsert({ key: "admin", value: { passwordHash }, updated_at: new Date().toISOString() });
    return !error;
  }
  db.settings["admin"] = { passwordHash };
  return true;
}

// ตรวจรหัสที่กรอก — DB ก่อน, ไม่มีค่อย fallback env ADMIN_KEY
export async function verifyAdminPassword(pw: string): Promise<boolean> {
  if (!pw) return false;
  const dbHash = await getAdminHash();
  if (dbHash) return hashPassword(pw) === dbHash;
  const envKey = process.env.ADMIN_KEY;
  return Boolean(envKey && pw === envKey);
}

// ค่าที่เก็บใน cookie หลังล็อกอินสำเร็จ (ใช้เทียบใน middleware)
export async function adminCookieValue(): Promise<string> {
  const dbHash = await getAdminHash();
  return dbHash ?? process.env.ADMIN_KEY ?? "";
}

// เทียบแบบ constant-time — กัน timing attack เดารหัสทีละตัว
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// ตรวจสิทธิ์ admin จาก cookie จริง ๆ (ไม่ใช่แค่ "มี cookie อยู่")
export async function isAdmin(): Promise<boolean> {
  const key = process.env.ADMIN_KEY;
  if (!key) return false; // ไม่ตั้ง ADMIN_KEY = ไม่มีใครเป็น admin (fail closed)
  const jar = await cookies();
  const v = jar.get(ADMIN_COOKIE)?.value;
  return Boolean(v && safeEqual(v, key));
}

// ใช้เป็นบรรทัดแรกของทุก server action ฝั่ง admin
//
// เหตุผล: middleware ป้องกันแค่ "หน้า" /admin/* แต่ server action เป็น POST
// ที่ยิงเข้า route ไหนก็ได้ที่ action ถูก register ไว้ (รวมหน้าแรก `/` ซึ่ง
// middleware ไม่ match) ถ้าไม่ตรวจในตัว action เอง คนนอกยิง action ตรง ๆ ได้เลย
export async function requireAdmin(): Promise<void> {
  if (!(await isAdmin())) redirect("/admin-gate");
}
