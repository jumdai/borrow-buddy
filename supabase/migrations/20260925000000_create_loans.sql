-- Borrow Buddy v2: ตาราง loans พร้อม RLS (design.md ข้อ 4 และ 6)

create table public.loans (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id),
  friend_name text not null check (length(trim(friend_name)) > 0),
  item_name text not null check (length(trim(item_name)) > 0),
  borrowed_date date not null,
  due_date date not null,
  returned_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint loans_due_not_before_borrowed check (due_date >= borrowed_date),
  constraint loans_returned_not_before_borrowed
    check (returned_date is null or returned_date >= borrowed_date)
);

create index loans_owner_id_idx on public.loans (owner_id);

-- อัปเดต updated_at ทุกครั้งที่แก้ไขแถว
create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger loans_set_updated_at
before update on public.loans
for each row execute function public.set_updated_at();

-- สิทธิ์: เจ้าของที่เข้าสู่ระบบแล้วอ่าน/เพิ่ม/แก้ได้ ไม่มีใครลบผ่าน API ได้
alter table public.loans enable row level security;

revoke all on public.loans from anon, authenticated;
grant select, insert, update on public.loans to authenticated;

create policy "Owners can view their own loans"
on public.loans for select
to authenticated
using ((select auth.uid()) = owner_id);

create policy "Owners can create their own loans"
on public.loans for insert
to authenticated
with check ((select auth.uid()) = owner_id);

create policy "Owners can update their own loans"
on public.loans for update
to authenticated
using ((select auth.uid()) = owner_id)
with check ((select auth.uid()) = owner_id);

-- ไม่มี policy สำหรับ delete โดยตั้งใจ (ยังไม่มีการลบ Loan)
