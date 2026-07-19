-- ข้อมูลร้าน: เบอร์ติดต่อ + บัญชีธนาคาร + เอกสารยืนยัน + สถานะอนุมัติ
alter table sellers add column if not exists contact_phone text;
alter table sellers add column if not exists bank_name text;
alter table sellers add column if not exists bank_account_no text;
alter table sellers add column if not exists bank_account_name text;
alter table sellers add column if not exists company_name text;
alter table sellers add column if not exists book_bank_url text;   -- path ใน bucket 'docs' (private)
alter table sellers add column if not exists verify_status text not null default 'none'; -- none|pending|approved|rejected
alter table sellers add column if not exists verify_note text;

-- bucket เอกสารยืนยัน (ไม่ public — ดูผ่าน signed URL เท่านั้น)
insert into storage.buckets (id, name, public) values ('docs','docs', false)
on conflict (id) do nothing;
