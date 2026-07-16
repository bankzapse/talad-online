# สถานะ Production — ตลาดออนไลน์ (Phase 1)

เว็บ live: **https://talad-online.vercel.app** · health check: `/api/health`

---

## ✅ เสร็จหมดแล้วฝั่งโค้ด/ระบบ (100%)
- Supabase Pro (persist จริง) + RLS + storage · Vercel production (public)
- **LINE Login ใช้งานจริง** (channel 2010726432) — ผู้ขายล็อกอินด้วย LINE ได้
- ลงประกาศ (รูป/ราคา/หน่วย/หมวด/พื้นที่/วิธีรับของ) + admin จัดการหมวด
- ระบบสมาชิก: ทดลอง 30 วัน → เลือกแพ็ก → PromptPay QR/โอน + เลขลงท้ายกันยอดชน → อัปสลิป → admin ยืนยัน/ปฏิเสธ+ส่งใหม่ → ต่ออายุ → **ใบเสร็จชั่วคราว** → ประวัติ
- ประกาศซ่อนอัตโนมัติเมื่อสมาชิกหมด · admin แก้บัญชีรับเงิน · สรุปรายได้+CSV
- Trust & safety: วิธีรับของ (นัดรับ/COD/พัสดุ) + เตือนคนละจังหวัด + ห้ามโอนล่วงหน้า + หน้า /help
- ความปลอดภัย: admin ล็อก ADMIN_KEY, กัน open-redirect/IDOR, validate input, RLS
- SEO ครบ (meta/OG/JSON-LD/sitemap/robots/favicon) + ดีไซน์พรีเมียม + loading states
- Production hardening: error/404 pages, /api/health, insert ทนคอลัมน์ที่ยังไม่ migrate

---

## ⏳ เหลือเฉพาะสิ่งที่ "ต้องคุณทำเอง" (ผมทำแทนไม่ได้)

### 🔴 ทำให้ครบก่อนเปิดจริง
1. **Publish LINE channel** — LINE Developers → channel → ให้สถานะเป็น "Published" (ไม่งั้นล็อกอินได้เฉพาะ tester)
2. **Verify Callback URL** = `https://talad-online.vercel.app/api/auth/line/callback` ลงทะเบียนในแท็บ LINE Login
3. **Re-run `supabase/schema.sql`** (idempotent) — เพิ่มตาราง `settings` + คอลัมน์ `delivery_method` (แอปทนได้แล้วถ้ายังไม่รัน แต่ควรรันเพื่อให้ครบ)
4. **Rotate `service_role` key** — เคยอยู่ในแชท (Supabase → Settings → API → roll → อัปเดต env → redeploy)

### 🟡 เสริม (สมัคร provider แล้วผมต่อ logic ให้)
- **OTP** ยืนยันเบอร์ (ThaiBulkSMS) → กันสมัครซ้ำ + badge ยืนยัน
- **ตรวจสลิปอัตโนมัติ** (SlipOK/slip2go) → `SLIP_VERIFY_*`
- **PromptPay ID** ใส่ใน /admin/settings → QR ทำงานทันที
- **LINE Messaging** access token → push แจ้งเตือนผู้ขายเมื่อมีคนติดต่อ
- **Uptime monitor** → ชี้มาที่ `/api/health` (UptimeRobot ฟรี)

### ⚖️ กฎหมาย/ปฏิบัติการ
- ทนายรีวิว Terms/Privacy · จดทะเบียนพาณิชย์ (DBD) · ปรึกษาบัญชี VAT
- คนดูแล moderation · ทดสอบจ่ายเงินจริง 5–10 คน · (ทางเลือก) custom domain

---

## 🔑 ค่าที่ต้องเก็บ
- **ADMIN_KEY** (เข้า /admin) = อยู่ใน `.env.local`
- ใส่ env ใหม่: เติม `.env.local` → `bash scripts/setup-vercel-env.sh production` → `npx vercel --prod --scope chao-dee`

> โค้ด Phase 1 พร้อม production 100% · เหลือเฉพาะการตั้งค่าบัญชีภายนอก + งานกฎหมาย ที่อยู่นอกมือผม
