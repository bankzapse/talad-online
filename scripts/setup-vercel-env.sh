#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# ตั้งค่า Environment Variables บน Vercel จากไฟล์ .env.local
# คุณรันสคริปต์นี้เอง → secret ไม่ผ่านใครอื่น
#
# วิธีใช้:
#   1) cp .env.example .env.local  แล้วเติมค่าจริง (Supabase/LINE/ฯลฯ)
#   2) bash scripts/setup-vercel-env.sh production
#      (หรือ preview / development)
# ---------------------------------------------------------------------------
set -euo pipefail

TARGET="${1:-production}"
ENV_FILE=".env.local"
SCOPE="chao-dee"   # ทีม Vercel ที่ deploy โปรเจกต์นี้

if [ ! -f "$ENV_FILE" ]; then
  echo "❌ ไม่พบ $ENV_FILE — คัดลอกจาก .env.example แล้วเติมค่าก่อน"
  exit 1
fi

echo "→ กำลังตั้งค่า env ($TARGET) บน Vercel scope=$SCOPE จาก $ENV_FILE"

while IFS= read -r line || [ -n "$line" ]; do
  # ข้ามคอมเมนต์/บรรทัดว่าง
  [[ "$line" =~ ^[[:space:]]*# ]] && continue
  [[ -z "${line// }" ]] && continue
  key="${line%%=*}"
  val="${line#*=}"
  # ข้ามค่าที่ยังว่าง
  [[ -z "$val" ]] && continue

  echo "  • $key"
  # ลบ key เดิม (ถ้ามี) แล้วเพิ่มใหม่
  npx vercel env rm "$key" "$TARGET" --scope "$SCOPE" --yes >/dev/null 2>&1 || true
  printf "%s" "$val" | npx vercel env add "$key" "$TARGET" --scope "$SCOPE" >/dev/null
done < "$ENV_FILE"

echo "✓ เสร็จ — deploy ใหม่เพื่อให้ env มีผล:  npx vercel --prod --scope $SCOPE"
