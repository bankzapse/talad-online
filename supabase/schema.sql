-- =============================================================================
-- talad-ruam — Supabase schema (Phase 1 MVP)
-- รันใน Supabase SQL Editor เพื่อสร้างตาราง + RLS + seed
-- แผนอ้างอิง: MVP-แผนเว็บตลาด-FINAL.md
-- =============================================================================

-- ---------- reference ----------
create table if not exists categories (
  id text primary key,
  name text not null,
  emoji text not null default '🛍️'
);

create table if not exists areas (
  id text primary key,
  province text not null,
  market text not null
);

-- ---------- sellers ----------
create table if not exists sellers (
  id uuid primary key default gen_random_uuid(),
  line_user_id text unique,
  display_name text not null,
  phone text unique,                    -- 1 เบอร์ = 1 สิทธิ์ทดลอง (กันสมัครซ้ำ)
  phone_verified boolean not null default false,
  joined_at timestamptz not null default now(),
  membership_expires_at timestamptz,
  trial_used boolean not null default false,
  blocked boolean not null default false
);

-- ---------- listings ----------
do $$ begin
  create type listing_status as enum ('active','sold','hidden','pending_review');
exception when duplicate_object then null; end $$;

create table if not exists listings (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references sellers(id) on delete cascade,
  title text not null,
  description text not null default '',
  price numeric not null check (price >= 0),
  unit text not null,
  category_id text not null references categories(id),
  area_id text not null references areas(id),
  images text[] not null default '{}',
  status listing_status not null default 'active',
  report_count int not null default 0,
  flagged_keywords text[] not null default '{}',
  created_at timestamptz not null default now()
);
create index if not exists listings_status_idx on listings(status);
create index if not exists listings_area_idx on listings(area_id);
create index if not exists listings_category_idx on listings(category_id);

-- ---------- membership packages ----------
create table if not exists packages (
  id text primary key,
  name text not null,
  days int not null,
  price numeric not null,
  active boolean not null default true
);

-- ---------- payments ----------
do $$ begin
  create type payment_status as enum ('pending','verified','rejected');
exception when duplicate_object then null; end $$;

create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references sellers(id) on delete cascade,
  package_id text not null references packages(id),
  amount numeric not null,
  slip_url text,
  status payment_status not null default 'pending',
  note text,
  created_at timestamptz not null default now(),
  verified_at timestamptz
);

-- ---------- reports ----------
create table if not exists reports (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references listings(id) on delete cascade,
  reason text not null,
  created_at timestamptz not null default now()
);

-- ---------- admin logs ----------
create table if not exists admin_logs (
  id uuid primary key default gen_random_uuid(),
  action text not null,
  detail text not null,
  created_at timestamptz not null default now()
);

-- ---------- contact events (rate-limit + analytics) ----------
create table if not exists contact_events (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references listings(id) on delete cascade,
  buyer_key text not null,
  created_at timestamptz not null default now()
);
create index if not exists contact_events_idx on contact_events(listing_id, buyer_key, created_at);

-- =============================================================================
-- RLS — กันผู้ขาย A แก้/ลบประกาศผู้ขาย B (ช่องโหว่ #5 ในแผน)
-- สมมติ auth.jwt() มี claim 'seller_id' หลังต่อ LINE Login → Supabase Auth
-- =============================================================================
alter table listings enable row level security;
alter table sellers  enable row level security;
alter table payments enable row level security;

-- ใครๆ อ่านประกาศที่ active ได้ (ฝั่งผู้ซื้อไม่ต้องล็อกอิน)
drop policy if exists "public read active listings" on listings;
create policy "public read active listings"
  on listings for select
  using (status = 'active');

-- เจ้าของอ่าน/แก้/ลบประกาศตัวเองได้
drop policy if exists "owner manage own listings" on listings;
create policy "owner manage own listings"
  on listings for all
  using (seller_id::text = (auth.jwt() ->> 'seller_id'))
  with check (seller_id::text = (auth.jwt() ->> 'seller_id'));

-- เจ้าของอ่าน/แก้ข้อมูลตัวเอง
drop policy if exists "seller self" on sellers;
create policy "seller self"
  on sellers for all
  using (id::text = (auth.jwt() ->> 'seller_id'))
  with check (id::text = (auth.jwt() ->> 'seller_id'));

-- เจ้าของเห็น payment ตัวเอง
drop policy if exists "payment self read" on payments;
create policy "payment self read"
  on payments for select
  using (seller_id::text = (auth.jwt() ->> 'seller_id'));

-- หมายเหตุ: งาน admin/moderation ให้ทำผ่าน service_role key (ฝั่ง server) ซึ่ง bypass RLS

-- =============================================================================
-- seed — หมวด + พื้นที่ + แพ็ก
-- =============================================================================
insert into categories (id,name,emoji) values
  ('cat-veg','ผัก','🥬'),('cat-fruit','ผลไม้','🍎'),('cat-meat','เนื้อสัตว์','🍖'),
  ('cat-seafood','อาหารทะเล','🦐'),('cat-dry','ของแห้ง','🌾'),
  ('cat-cooked','อาหารปรุงสำเร็จ','🍲'),('cat-secondhand','มือสอง','📦'),('cat-other','อื่นๆ','🛍️')
on conflict (id) do nothing;

insert into areas (id,province,market) values
  ('area-si-mum','นครราชสีมา','ตลาดสีมามุม'),
  ('area-suranaree','นครราชสีมา','ตลาดสุรนารี'),
  ('area-warorot','เชียงใหม่','ตลาดวโรรส (กาดหลวง)'),
  ('area-mueang-mai','เชียงใหม่','ตลาดเมืองใหม่'),
  ('area-thonburi','กรุงเทพฯ','ตลาดพลู')
on conflict (id) do nothing;

insert into packages (id,name,days,price,active) values
  ('pkg-7d','7 วัน',7,39,true),
  ('pkg-1m','รายเดือน',30,99,true),
  ('pkg-3m','3 เดือน',90,279,true),
  ('pkg-6m','6 เดือน',180,539,true),
  ('pkg-1y','รายปี',365,999,true)
on conflict (id) do nothing;

-- =============================================================================
-- Storage bucket สำหรับรูปประกาศ (public read)
-- =============================================================================
insert into storage.buckets (id, name, public)
values ('listings','listings', true)
on conflict (id) do nothing;

-- อนุญาตอ่าน public + เขียนผ่าน service role (แอปอัปโหลดฝั่ง server)
drop policy if exists "public read listing images" on storage.objects;
create policy "public read listing images"
  on storage.objects for select
  using (bucket_id = 'listings');

