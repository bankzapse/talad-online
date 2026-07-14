# 🧺 ตลาดรวม (talad-ruam)

กระดานประกาศซื้อขาย **ของสด + สินค้ามือสอง** ในตลาด — ผู้ซื้อ–ผู้ขายนัดเจอจ่ายเงินสดกันเอง
ระบบไม่แตะเงินซื้อขาย รายได้จากค่าสมาชิกผู้ขาย (ทดลองฟรี 30 วัน → แพ็ก 39–999฿)

> MVP Phase 1 ตามแผนใน `MVP-แผนเว็บตลาด-FINAL.md`
> Stack: **Next.js 15 (App Router) + TypeScript + Tailwind** · เตรียมต่อ **Supabase** + **LINE** + **PromptPay/ตรวจสลิป**

---

## ▶️ รันในเครื่อง

```bash
npm install
npm run dev        # http://localhost:3000
```

รันได้ทันทีในโหมด **demo** (ข้อมูลตัวอย่าง + in-memory store) โดยไม่ต้องตั้งค่า env ใดๆ

---

## ✅ ฟีเจอร์ที่มีในโค้ดนี้ (Phase 1)

| ส่วน | ฟีเจอร์ |
|------|---------|
| **ผู้ซื้อ** | หน้ารวมประกาศ · filter หมวด/พื้นที่ · เรียงราคา (แสดงหน่วยชัด) · ค้นหา · หน้ารายละเอียด · ปุ่มติดต่อ (ล็อกอิน+rate-limit+fallback) · รายงานประกาศ |
| **ผู้ขาย** | LINE login (stub) · ร้านของฉัน · ลงประกาศ (หน่วย/หมวด/พื้นที่ + ตรวจ blocklist) · ปิด/เปิดขาย · สมาชิก+แพ็ก+PromptPay+อัปสลิป |
| **Trust** | badge ยืนยันเบอร์ / วันเข้าร่วม / จำนวนประกาศ |
| **Admin** | analytics (รายได้/ผู้ขายจ่าย/conversion) · คิวตรวจ (blocklist+report) · ยืนยัน/ปฏิเสธการจ่าย · ปรับวันหมดอายุ+log · แก้ราคาแพ็ก · แบน/ปลดแบน |
| **กติกา** | หมดอายุ=ซ่อนไม่ลบ · ต่ออายุ=ต่อท้ายวันเดิม · ขึ้นราคามีผลรอบใหม่ |
| **ความปลอดภัย** | keyword blocklist ของต้องห้าม · disclaimer อาหาร · rate-limit ปุ่มติดต่อ · RLS (ใน schema.sql) |

หน้าเข้าใช้: `/` (ผู้ซื้อ) · `/login` (ผู้ขาย) · `/sell` (ร้าน) · `/admin` (แผงควบคุม)

---

## 🔌 ทำให้ใช้งานจริง (จาก demo → production)

โค้ดออกแบบให้ต่อบริการจริงทีละชิ้นผ่าน env (ดู `.env.example`) โดยไม่ต้องรื้อ UI:

1. **Supabase** — สร้าง project → รัน `supabase/schema.sql` (สร้างตาราง + RLS + seed) → ใส่ `NEXT_PUBLIC_SUPABASE_URL/ANON_KEY` แล้วแทน query ใน `src/lib/data.ts` ด้วย Supabase (โครง type เหมือนกัน)
2. **LINE Login** — สร้าง channel → แลก id_token เป็น session แทน stub ใน `src/app/actions.ts`
3. **LINE Messaging API** — ใส่ `LINE_CHANNEL_ACCESS_TOKEN` → `src/lib/line.ts` จะ push จริง (มี fallback เมื่อโควตาหมด)
4. **ตรวจสลิป** — ใส่ `SLIP_VERIFY_*` → เรียกตอนอัปสลิปในหน้า membership แทนการจำลอง
5. **OTP** — ใส่ `OTP_*` → บังคับยืนยันเบอร์ตอนสมัคร (1 เบอร์ = 1 สิทธิ์ทดลอง)

> ⚠️ โหมด demo เก็บข้อมูลใน memory — บน serverless การเขียนจะไม่คงอยู่ข้าม request ต้องต่อ Supabase เพื่อ persist จริง

---

## 🚫 รายการของต้องห้าม (ย่อ)

ตั้งค่าใน `src/lib/blocklist.ts` — ประกาศที่ติดคำจะเข้าคิว admin (ไม่ลบทันที กัน false positive):
ยาเสพติด · อาวุธ · เหล้า/บุหรี่/บุหรี่ไฟฟ้า · ยา/อาหารเสริมอวดอ้าง · สัตว์คุ้มครอง · ของโจร · การเงิน/แชร์ลูกโซ่ · บริการทางเพศ
(ฉบับเต็มดู `รายการของต้องห้าม.md` / `MVP-แผนเว็บตลาด-FINAL.md`)

---

## 💰 ต้นทุน & จุดคุ้มทุน (ย่อ)

ต้นทุนแปรผัน (LINE push/OTP/ตรวจสลิป) น้อยมาก — ตัวหลักคือ fixed cost + ค่าคน
**คุ้มค่าระบบ ~22 ผู้ขายจ่ายเงิน · คุ้มรวมคนดูแล ~100 คน** (รายละเอียดใน `ประเมินต้นทุน-break-even.md`)

---

## ☁️ Deploy (Vercel)

1. Import repo นี้ที่ [vercel.com/new](https://vercel.com/new) → เลือก `bankzapse/talad-ruam`
2. Framework: **Next.js** (ตรวจจับอัตโนมัติ) — ไม่ต้องตั้งค่าเพิ่มก็ deploy demo ได้เลย
3. (เมื่อพร้อม) เพิ่ม Environment Variables ตาม `.env.example`

หรือผ่าน CLI: `npx vercel --prod`

---

## 🗺️ Phase ถัดไป

- **Phase 2:** ค่าดันประกาศ · รีวิวผู้ขาย · ของสดหมดอายุอัตโนมัติ · full-text search ไทย · AI image moderation
- **Phase 3:** แจ้งเตือนเพิ่มเติม · แอปมือถือ
