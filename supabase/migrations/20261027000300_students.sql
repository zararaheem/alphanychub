-- Student roster (names, grade, level). Everyone on the access list reads it;
-- Admins and Campus Coordinators update it. Parent details stay in parent_contacts.
create table if not exists public.students (
  id          bigint generated always as identity primary key,
  first_name  text not null,
  last_name   text not null,
  grade       text,
  level       text,
  campus      text not null check (campus in ('early-years', 'maiden-ln')),
  updated_at  timestamptz not null default now()
);

alter table public.students enable row level security;
revoke all on public.students from anon;

drop policy if exists "members read" on public.students;
create policy "members read" on public.students
  for select to authenticated using (public.is_hub_member());

drop policy if exists "managers write" on public.students;
create policy "managers write" on public.students
  for all to authenticated using (public.can_manage_staff()) with check (public.can_manage_staff());
