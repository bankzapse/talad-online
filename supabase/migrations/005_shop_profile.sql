-- ข้อมูลร้านค้า (ต้องกรอกก่อนลงประกาศ)
alter table sellers add column if not exists shop_name text;
alter table sellers add column if not exists shop_about text;
