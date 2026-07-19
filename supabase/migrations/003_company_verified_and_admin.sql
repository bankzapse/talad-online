-- =============================================================================
-- Migration ล่าสุด — รันใน Supabase → SQL Editor (ปลอดภัย รันซ้ำได้)
-- =============================================================================

-- 1) ร้านที่ยืนยันตัวตนกับบริษัท → ใช้วิธีรับของแบบ "โอนเงินก่อนรับสินค้า" ได้
alter table sellers add column if not exists company_verified boolean not null default false;

-- 2) ตาราง settings (ถ้ายังไม่มี) — เก็บบัญชีรับเงิน + รหัส admin
create table if not exists settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table settings enable row level security;

-- 3) วิธีรับของ (ถ้ายังไม่มี)
alter table listings add column if not exists delivery_method text not null default 'meetup';


-- =============================================================================
-- (ทางเลือก) ตั้งรหัสผ่าน admin ตรงจาก Supabase — เผื่อลืมรหัส/ล็อกเอาต์
-- วิธีใช้: แทนที่ 'รหัสใหม่ของคุณ' แล้วรัน
-- ระบบเก็บเป็น sha256 ของ 'talad-online:' + รหัส
-- =============================================================================
-- insert into settings (key, value)
-- values ('admin', jsonb_build_object(
--   'passwordHash', encode(digest('talad-online:' || 'รหัสใหม่ของคุณ', 'sha256'), 'hex')
-- ))
-- on conflict (key) do update set value = excluded.value, updated_at = now();
--
-- หมายเหตุ: ต้องเปิด extension pgcrypto ก่อน (รันครั้งเดียว):
-- create extension if not exists pgcrypto;
