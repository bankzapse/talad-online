-- =============================================================================
-- 012 — ที่ตั้งร้าน (ตั้งครั้งเดียวที่ข้อมูลร้าน แล้วประกาศดึงไปใช้)
-- เดิมผู้ขายต้องเลือก จังหวัด/อำเภอ/ตำบล ใหม่ทุกครั้งที่ลงประกาศ
-- =============================================================================
alter table sellers add column if not exists province text;
alter table sellers add column if not exists district text;
alter table sellers add column if not exists subdistrict text;
alter table sellers add column if not exists market_name text;

-- ร้านที่มีประกาศอยู่แล้ว → ใช้ที่ตั้งจากประกาศล่าสุดเป็นค่าเริ่มต้น
update sellers s
set province    = l.province,
    district    = l.district,
    subdistrict = l.subdistrict,
    market_name = l.market_name
from (
  select distinct on (seller_id)
         seller_id, province, district, subdistrict, market_name
  from listings
  where province is not null and province <> ''
  order by seller_id, created_at desc
) l
where l.seller_id = s.id
  and (s.province is null or s.province = '');
