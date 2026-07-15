# สถานะ Production + ช่องโหว่/สิ่งที่เหลือ (ตรวจ ณ ล่าสุด)

สรุปสิ่งที่ทำเสร็จแล้ว, ช่องโหว่ที่ปิดไปแล้ว, และสิ่งที่เหลือ (ต้องใช้บัญชี/การตัดสินใจของคุณ)

---

## ✅ ทำเสร็จ + ใช้งานจริงบน production แล้ว
- เว็บ live: **https://talad-ruam.vercel.app** (Supabase persist จริง, ข้อมูลไม่หาย)
- ฐานข้อมูล Supabase (Pro) + schema + RLS + storage bucket
- หน้า admin **ล็อกด้วย ADMIN_KEY** แล้ว (`/admin-gate`)
- หน้ากฎหมาย **/terms + /privacy (PDPA)** + consent ตอน login
- โค้ด LINE Login / อัปโหลดรูป / ตรวจสลิป — **พร้อมทำงานทันทีที่ใส่ env**

### 🔑 ข้อมูลสำคัญ
- **ADMIN_KEY** (รหัสเข้า /admin): ผมสร้างให้และตั้งบน Vercel แล้ว — ค่าอยู่ในไฟล์ `.env.local` (บรรทัด `ADMIN_KEY=`) เปิดดูได้ ใช้ล็อกอินที่ `/admin-gate`

---

## 🔒 ช่องโหว่ความปลอดภัยที่ปิดแล้ว (รอบนี้)
- **Open-redirect** จากพารามิเตอร์ `next` (LINE login/redirect) → sanitize ให้รับเฉพาะ path ภายใน
- **IDOR ฝั่งผู้ขาย** → ทุก action ตรวจ seller จาก session จริง + ตรวจสิทธิ์เจ้าของก่อนแก้/ปิดประกาศ
- **Demo login backdoor** → ปิดอัตโนมัติเมื่อ LINE Login เปิดใช้ (บังคับผ่าน LINE เท่านั้น)
- **Input validation** → จำกัดความยาว/ชนิดไฟล์/ช่วงราคา + ตรวจชนิดรูปที่อัปโหลด
- **หน้า admin** → มี middleware + ADMIN_KEY (เดิมเปิดสาธารณะ)

### ⚠️ ความปลอดภัยที่คุณควรทำเพิ่ม
1. **Rotate `service_role` key** — เพราะเคยวางในแชทตอน setup (ถ้าแชทนั้นถูกแชร์/หลุด key มีสิทธิ์เต็ม)
   → Supabase → Settings → API → roll `service_role` → อัปเดต `.env.local` + `bash scripts/setup-vercel-env.sh production` → redeploy
2. **ปิด Vercel Deployment Protection ให้เหมาะ** (ตอนนี้ production เปิด public อยู่แล้ว — ok)
3. เปิด **2FA** บนบัญชี GitHub / Vercel / Supabase

---

## ⏳ สิ่งที่เหลือ — ต้องใช้บัญชี/ความลับของคุณ (ผมทำแทนไม่ได้)

### 1. LINE Login (ขั้น 2) — ยังไม่ได้ตั้ง → ตอนนี้ผู้ขายยังล็อกอินจริงไม่ได้
โค้ดพร้อมแล้ว เหลือสร้าง channel + ใส่ env:
1. [developers.line.biz](https://developers.line.biz) → Provider → channel แบบ **LINE Login**
2. **Callback URL** = `<domain จริง>/api/auth/line/callback`
   - ⚠️ domain: ถ้าจะใช้ **talad-online** ต้อง rename Vercel project ให้เสร็จก่อน (ตอนนี้ live เป็น `talad-ruam.vercel.app`) แล้วอัปเดต `NEXT_PUBLIC_APP_URL` ให้ตรง
3. ใส่ env: `LINE_LOGIN_CHANNEL_ID`, `LINE_LOGIN_CHANNEL_SECRET`

### 2. LINE Messaging API — push แจ้งเตือนผู้ขาย
- สร้าง channel Messaging API → `LINE_CHANNEL_ACCESS_TOKEN`

### 3. ตรวจสลิป PromptPay — ยืนยันเงินอัตโนมัติ
- สมัคร SlipOK/slip2go/EasySlip → `SLIP_VERIFY_API_KEY`, `SLIP_VERIFY_ENDPOINT`, `PROMPTPAY_ID`
- แล้วต่อ logic เรียก API ตอนอัปสลิป (ตอนนี้เป็นการจำลอง → admin กดยืนยันเอง)

### 4. OTP ยืนยันเบอร์ — กันสมัครซ้ำ
- สมัคร ThaiBulkSMS ฯลฯ → `OTP_API_KEY`, `OTP_SENDER` + ต่อ logic ตอนสมัคร

> ใส่ env พวกนี้: เติมใน `.env.local` → `bash scripts/setup-vercel-env.sh production` → `npx vercel --prod --scope chao-dee`

---

## ⚖️ กฎหมาย — เหลือการดำเนินการของคุณ
- [ ] **ให้ทนายรีวิว** ร่าง Terms + Privacy (ในเว็บเป็นแบบร่างตั้งต้น มีแบนเนอร์เตือนอยู่)
- [ ] **จดทะเบียนพาณิชย์อิเล็กทรอนิกส์ (DBD)** — บังคับตามกฎหมาย
- [ ] **ปรึกษาบัญชี** เรื่อง VAT (รายได้ค่าสมาชิกเกิน 1.8 ล้าน/ปี) + ใบกำกับภาษี
- [ ] ตรวจข้อกำหนดอาหาร (อย.) หากมีหมวดอาหารแปรรูป

---

## 🧩 Gap เชิงระบบ/ปฏิบัติการ (แนะนำก่อนเปิดจริงวงกว้าง)
- **ต่อ logic ตรวจสลิปจริง** (ตอนนี้ admin ยืนยันมือ) — จุดที่พลาดแล้วเป็นดราม่า
- **Monitoring/alert** เมื่อระบบล่ม (เช่น Vercel/Supabase log + แจ้งเตือน)
- **คนดูแล moderation** — คิวตรวจมีแล้ว แต่ต้องมีคนกด
- **ทดสอบ flow จ่ายเงินจริง 5–10 คน** ก่อนเปิดกว้าง
- **โมเดล break-even**: คุ้มที่ ~100 ผู้ขายจ่ายเงิน (ดู `docs/ประเมินต้นทุน-break-even.md`)

---

## 📌 ลำดับแนะนำถัดไป
1. Rotate `service_role` key (ความปลอดภัย)
2. Finalize domain (rename Vercel → talad-online หรือผูก custom domain) + อัปเดต `NEXT_PUBLIC_APP_URL`
3. ตั้ง LINE Login + Messaging (ให้ผู้ขายใช้งานได้จริง)
4. ต่อ API ตรวจสลิป + OTP
5. เอกสารกฎหมาย (ทนาย + DBD + บัญชี)
6. เปิดตลาดนำร่อง 1 แห่ง → ดันให้ถึง ~100 ผู้ขายจ่ายเงิน
