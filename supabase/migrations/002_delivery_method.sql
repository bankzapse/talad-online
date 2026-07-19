-- Migration ที่ยังค้างอยู่เพียงอันเดียว (รันใน Supabase → SQL Editor)
-- ปลอดภัย: รันซ้ำได้ ไม่กระทบข้อมูลเดิม
alter table listings add column if not exists delivery_method text not null default 'meetup';
