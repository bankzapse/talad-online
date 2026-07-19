-- =============================================================================
-- รวม migration 007 + 008 + 009 — รันทีเดียวจบใน Supabase SQL Editor
--   007 · จัดเรียงหมวดสินค้า + ระบบรายการสั่งซื้อ
--   008 · LINE ID ของร้าน
--   009 · ประกาศต้องผ่านการอนุมัติก่อนแสดง
-- รันซ้ำได้ปลอดภัย (idempotent ทุกคำสั่ง)
-- =============================================================================


-- =============================================================================
-- 007 · จัดเรียงลำดับหมวดสินค้า
-- =============================================================================
alter table categories add column if not exists sort_order int not null default 100;

-- backfill ให้หมวดเดิมเรียงตามที่ seed ไว้ (ผัก → ผลไม้ → ... → อื่นๆ)
update categories set sort_order = 10 where id = 'cat-veg'        and sort_order = 100;
update categories set sort_order = 20 where id = 'cat-fruit'      and sort_order = 100;
update categories set sort_order = 30 where id = 'cat-meat'       and sort_order = 100;
update categories set sort_order = 40 where id = 'cat-seafood'    and sort_order = 100;
update categories set sort_order = 50 where id = 'cat-dry'        and sort_order = 100;
update categories set sort_order = 60 where id = 'cat-cooked'     and sort_order = 100;
update categories set sort_order = 70 where id = 'cat-secondhand' and sort_order = 100;
update categories set sort_order = 80 where id = 'cat-other'      and sort_order = 100;


-- =============================================================================
-- 007 · รายการสั่งซื้อ
-- =============================================================================
create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid references listings(id) on delete set null,
  seller_id uuid not null references sellers(id) on delete cascade,

  -- ผู้ซื้อ (buyer_key = LINE userId หรือ cookie ผู้ซื้อ)
  buyer_key text not null,
  buyer_name text not null,
  buyer_phone text not null,
  address text,                          -- ที่อยู่จัดส่ง — นัดรับไม่ต้องมี

  -- snapshot ข้อมูลสินค้า ณ เวลาสั่ง (กันประกาศถูกแก้/ลบแล้วออร์เดอร์เพี้ยน)
  listing_title text not null,
  price numeric not null default 0,
  unit text,
  qty numeric not null default 1,
  note text,

  delivery_method text not null default 'meetup',
  status text not null default 'pending',   -- pending|confirmed|shipped|completed|cancelled
  tracking_no text,
  carrier text,
  cancel_reason text,

  created_at timestamptz not null default now(),
  confirmed_at timestamptz
);

create index if not exists orders_seller_idx on orders(seller_id, created_at desc);
create index if not exists orders_buyer_idx  on orders(buyer_key, created_at desc);

-- เข้าถึงผ่าน service_role เท่านั้น (ที่อยู่ + เบอร์ผู้ซื้อเป็นข้อมูลส่วนบุคคล)
alter table orders enable row level security;


-- =============================================================================
-- 008 · LINE ID ของร้าน
-- LINE Login คืนมาแค่ userId ภายใน (U...) ซึ่งค้นหาไม่ได้
-- ID ที่คนทั่วไปใช้ทักได้ ต้องให้ร้านกรอกเอง
-- =============================================================================
alter table sellers add column if not exists line_id text;


-- =============================================================================
-- 009 · ประกาศต้องผ่านการอนุมัติจาก admin ก่อนแสดง
-- draft (ฉบับร่าง) → pending_review (ส่งขออนุมัติ) → active (อนุมัติแล้ว/แสดงจริง)
-- =============================================================================
alter type listing_status add value if not exists 'draft';

-- เหตุผลที่ทีมงานไม่อนุมัติ (ผู้ขายเห็นแล้วแก้ไขส่งใหม่ได้)
alter table listings add column if not exists review_note text;

-- หมายเหตุ: ประกาศเดิมที่ active อยู่แล้ว ถือว่าผ่านการอนุมัติแล้ว — ไม่ต้องยื่นใหม่
