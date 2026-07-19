-- =============================================================================
-- เปลี่ยนพื้นที่เป็น จังหวัด/อำเภอ/ตำบล (dropdown) + ชื่อตลาด (พิมพ์เอง)
-- รันใน Supabase → SQL Editor (ปลอดภัย รันซ้ำได้)
-- =============================================================================
alter table listings add column if not exists province text;
alter table listings add column if not exists district text;
alter table listings add column if not exists subdistrict text;
alter table listings add column if not exists market_name text;

-- area_id เดิมไม่ใช้แล้ว → ให้ว่างได้
alter table listings alter column area_id drop not null;

create index if not exists listings_province_idx on listings(province);
