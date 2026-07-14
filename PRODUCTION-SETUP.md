# 🚀 คู่มือเปิดใช้งานจริง (Production Setup)

โค้ดพร้อม "เปิดสวิตช์" ทำงานจริงทันทีเมื่อมี Environment Variables ครบ
เอกสารนี้คือขั้นตอนที่ **คุณต้องทำเอง** (สร้างบัญชี + คัดลอก key) เพราะเป็นความลับ/บัญชีของคุณ

> ระหว่างที่ยังไม่ตั้งค่า เว็บจะรันโหมด **demo** (ข้อมูลตัวอย่าง) ได้ตามปกติ

---

## ขั้นที่ 1 — Supabase (ทำให้ข้อมูล persist จริง)

1. สร้างโปรเจกต์ที่ [supabase.com](https://supabase.com) → New project
2. ไปที่ **SQL Editor** → วางเนื้อหาไฟล์ [`supabase/schema.sql`](supabase/schema.sql) ทั้งหมด → **Run**
   (สร้างตาราง + RLS + seed หมวด/พื้นที่/แพ็ก + bucket รูป)
3. ไปที่ **Project Settings → API** คัดลอก 3 ค่า:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` **(ความลับ! อย่าเปิดเผย)**
4. ตรวจว่า **Storage** มี bucket ชื่อ `listings` (schema สร้างให้แล้ว) เป็น public

---

## ขั้นที่ 2 — LINE Login (ผู้ขาย/ผู้ซื้อล็อกอินด้วย LINE จริง)

1. ไปที่ [developers.line.biz](https://developers.line.biz) → สร้าง **Provider**
2. สร้าง channel แบบ **LINE Login**
3. ในแท็บ **LINE Login** → **Callback URL** ใส่:
   ```
   https://<โดเมนจริงของคุณ>/api/auth/line/callback
   ```
   (เช่น `https://talad-ruam.vercel.app/api/auth/line/callback`)
4. แท็บ **Basic settings** คัดลอก:
   - `Channel ID` → `LINE_LOGIN_CHANNEL_ID`
   - `Channel secret` → `LINE_LOGIN_CHANNEL_SECRET`
5. ตั้ง `NEXT_PUBLIC_APP_URL` = โดเมนจริง (ให้ redirect_uri ตรงกับที่ลงทะเบียน)

---

## ขั้นที่ 3 — LINE Messaging API (push แจ้งเตือนผู้ขาย)

1. สร้าง channel แบบ **Messaging API** (LINE Official Account)
2. คัดลอก **Channel access token (long-lived)** → `LINE_CHANNEL_ACCESS_TOKEN`
3. (ทางเลือก) สร้าง **LIFF app** สำหรับฟอร์มลงสินค้าในแอป LINE → `NEXT_PUBLIC_LIFF_ID`

> ระบบมี fallback อยู่แล้ว: ถ้าโควตา push หมด (429) จะแสดงช่องทางติดต่อตรงแทน

---

## ขั้นที่ 4 — ตรวจสลิป PromptPay (ยืนยันเงินอัตโนมัติ)

เลือกผู้ให้บริการตรวจสลิปไทย (SlipOK / slip2go / EasySlip) — ถูกกว่า gateway ไม่หัก %
- `SLIP_VERIFY_API_KEY`, `SLIP_VERIFY_ENDPOINT`
- `PROMPTPAY_ID` = พร้อมเพย์บัญชีธุรกิจที่ให้ผู้ขายโอน

> จุดเชื่อม: เรียก API ตรวจสลิปตอนอัปสลิปในหน้า `sell/membership` แทนการจำลอง แล้วเรียก `verifyPayment()`

---

## ขั้นที่ 5 — OTP + Admin

- **OTP** (ThaiBulkSMS ฯลฯ): `OTP_API_KEY`, `OTP_SENDER` — บังคับยืนยันเบอร์ตอนสมัคร (1 เบอร์ = 1 สิทธิ์)
- **ADMIN_KEY**: ตั้งรหัสเพื่อ **ล็อกหน้า `/admin`** (ไม่ตั้ง = เปิด demo) — จะมีหน้า `/admin-gate` ให้กรอกรหัส

---

## ขั้นที่ 6 — ใส่ env บน Vercel แล้ว deploy

**วิธี A — สคริปต์ (แนะนำ, secret ไม่ผ่านใคร):**
```bash
cp .env.example .env.local     # แล้วเติมค่าจริงจากขั้น 1–5
bash scripts/setup-vercel-env.sh production
npx vercel --prod --scope chao-dee
```

**วิธี B — เว็บ Vercel:**
Project **talad-ruam** → **Settings → Environment Variables** → ใส่ทีละตัวตาม `.env.example` → **Redeploy**

---

## ✅ เช็กลิสต์เปิดจริง
- [ ] รัน `schema.sql` บน Supabase แล้ว
- [ ] ใส่ env Supabase 3 ตัว → ข้อมูล persist จริง (ลงประกาศแล้วไม่หาย)
- [ ] LINE Login callback URL ตรงกับโดเมนจริง
- [ ] `NEXT_PUBLIC_APP_URL` = โดเมนจริง
- [ ] `ADMIN_KEY` ตั้งแล้ว (หน้า admin ถูกล็อก)
- [ ] ปิด **Vercel Deployment Protection** เพื่อให้ผู้ซื้อทั่วไปเข้าได้ (Settings → Deployment Protection)
- [ ] ทดสอบ flow: ล็อกอิน LINE → ลงประกาศ → ผู้ซื้อกดติดต่อ → ผู้ขายได้ push
- [ ] เอกสารกฎหมาย (PDPA/Terms/จดทะเบียนพาณิชย์ฯ) ตาม `docs/MVP-แผนเว็บตลาด-FINAL.md`
