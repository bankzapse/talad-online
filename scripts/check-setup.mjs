// ตรวจสอบว่า .env.local ตั้งค่าถูกและเชื่อม Supabase ได้ไหม
// รัน: node scripts/check-setup.mjs   (ค่า secret อยู่ในเครื่องคุณ ไม่ถูกส่งไปไหน)
import { readFileSync } from "node:fs";

function loadEnv() {
  try {
    const txt = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
    for (const line of txt.split("\n")) {
      if (/^\s*#/.test(line) || !line.includes("=")) continue;
      const i = line.indexOf("=");
      const k = line.slice(0, i).trim();
      const v = line.slice(i + 1).trim();
      if (k && v && !process.env[k]) process.env[k] = v;
    }
  } catch {
    console.error("❌ ไม่พบ .env.local — คัดลอกจาก .env.example ก่อน");
    process.exit(1);
  }
}
loadEnv();

const mask = (v) => (v ? v.slice(0, 4) + "…" + v.slice(-4) : "(ว่าง)");
const show = (k) => console.log(`  ${process.env[k] ? "✓" : "·"} ${k} = ${mask(process.env[k])}`);

console.log("\n== Environment ==");
[
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "LINE_LOGIN_CHANNEL_ID",
  "LINE_LOGIN_CHANNEL_SECRET",
  "LINE_CHANNEL_ACCESS_TOKEN",
  "NEXT_PUBLIC_APP_URL",
  "ADMIN_KEY",
].forEach(show);

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.log("\n⚠️  ยังไม่ได้ตั้ง Supabase (URL + service_role) — ข้ามการเช็ค DB");
  process.exit(0);
}

console.log("\n== ทดสอบเชื่อม Supabase ==");
const { createClient } = await import("@supabase/supabase-js");
const sb = createClient(url, key, { auth: { persistSession: false } });

for (const table of ["categories", "areas", "packages", "sellers", "listings"]) {
  const { count, error } = await sb.from(table).select("id", { count: "exact", head: true });
  if (error) console.log(`  ❌ ${table}: ${error.message}`);
  else console.log(`  ✓ ${table}: ${count} แถว`);
}

const { data: buckets } = await sb.storage.listBuckets();
const hasBucket = (buckets ?? []).some((b) => b.id === "listings");
console.log(`  ${hasBucket ? "✓" : "❌"} storage bucket "listings" ${hasBucket ? "พร้อม" : "ยังไม่มี"}`);

console.log("\n✅ เช็คเสร็จ — ถ้าตารางมีแถว seed (categories 8, areas 5, packages 5) แปลว่า schema รันสำเร็จ\n");
