-- =============================================================================
-- 007 — จัดเรียงหมวดสินค้า + ระบบรายการสั่งซื้อ
-- =============================================================================

-- ---------- จัดเรียงลำดับหมวดสินค้า ----------
alter table categories add column if not exists sort_order int not null default 100;

-- backfill ให้หมวดเดิมเรียงตามที่ seed ไว้ (ผัก → ผลไม้ → ... → อื่นๆ)
update categories set sort_order = 10 where id = 'cat-veg'       and sort_order = 100;
update categories set sort_order = 20 where id = 'cat-fruit'     and sort_order = 100;
update categories set sort_order = 30 where id = 'cat-meat'      and sort_order = 100;
update categories set sort_order = 40 where id = 'cat-seafood'   and sort_order = 100;
update categories set sort_order = 50 where id = 'cat-dry'       and sort_order = 100;
update categories set sort_order = 60 where id = 'cat-cooked'    and sort_order = 100;
update categories set sort_order = 70 where id = 'cat-secondhand' and sort_order = 100;
update categories set sort_order = 80 where id = 'cat-other'     and sort_order = 100;

-- ---------- รายการสั่งซื้อ ----------
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
