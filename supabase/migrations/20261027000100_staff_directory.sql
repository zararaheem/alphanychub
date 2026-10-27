-- Staff directory: everyone who works on site, by campus.
-- Everyone on the access list reads it; Admins, Campus Coordinators and Lead Guides edit.
create table if not exists public.staff_directory (
  id          bigint generated always as identity primary key,
  campus      text not null default 'all' check (campus in ('all', 'early-years', 'maiden-ln')),
  name        text not null,
  title       text,
  team        text,
  email       text,
  phone       text,
  notes       text,
  sort        int not null default 0,
  updated_at  timestamptz not null default now()
);

alter table public.staff_directory enable row level security;
revoke all on public.staff_directory from anon;

drop policy if exists "members read" on public.staff_directory;
create policy "members read" on public.staff_directory
  for select to authenticated using (public.is_hub_member());

drop policy if exists "editors write" on public.staff_directory;
create policy "editors write" on public.staff_directory
  for all to authenticated using (public.can_edit_hub()) with check (public.can_edit_hub());
