-- Staff directory: everyone who works on site, by campus.
-- Everyone on the access list reads it; only Admins and Campus Coordinators add, edit or move people.
create table if not exists public.staff_directory (
  id          bigint generated always as identity primary key,
  campus      text not null default 'unassigned' check (campus in ('unassigned', 'all', 'early-years', 'maiden-ln')),
  name        text not null,
  title       text,
  team        text,
  email       text,
  phone       text,
  notes       text,
  sort        int not null default 0,
  updated_at  timestamptz not null default now()
);

-- In case an earlier version of this table already exists.
alter table public.staff_directory alter column campus set default 'unassigned';
alter table public.staff_directory drop constraint if exists staff_directory_campus_check;
alter table public.staff_directory add constraint staff_directory_campus_check check (campus in ('unassigned', 'all', 'early-years', 'maiden-ln'));

alter table public.staff_directory enable row level security;
revoke all on public.staff_directory from anon;

drop policy if exists "members read" on public.staff_directory;
create policy "members read" on public.staff_directory
  for select to authenticated using (public.is_hub_member());

create or replace function public.can_manage_staff()
returns boolean
language sql
stable
as $$
  select coalesce(public.hub_role() in ('admin', 'coordinator'), false);
$$;

drop policy if exists "editors write" on public.staff_directory;
drop policy if exists "managers write" on public.staff_directory;
create policy "managers write" on public.staff_directory
  for all to authenticated using (public.can_manage_staff()) with check (public.can_manage_staff());
