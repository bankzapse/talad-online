-- =============================================================================
-- 010 — ปิดช่องโหว่จากผลตรวจระบบ
-- =============================================================================

-- 1 คน = 1 รายงานต่อประกาศ (เดิมยิงซ้ำ 3 ครั้งก็ปลดประกาศคู่แข่งได้)
alter table reports add column if not exists buyer_key text;
create index if not exists reports_dedup_idx on reports(listing_id, buyer_key);

-- phone_verified มีอยู่แค่ใน schema.sql (create table if not exists)
-- ฐานข้อมูลที่สร้างก่อนฟีเจอร์ OTP จะไม่มีคอลัมน์นี้ → ยืนยันเบอร์ไม่ผ่าน
alter table sellers add column if not exists phone_verified boolean not null default false;
create unique index if not exists sellers_phone_key on sellers(phone);
