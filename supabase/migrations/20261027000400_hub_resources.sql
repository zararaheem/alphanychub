-- Resource library the Ask assistant answers from (security notes, policies,
-- how-tos). Everyone on the access list reads; Admins and Campus Coordinators edit.
create table if not exists public.hub_resources (
  id          bigint generated always as identity primary key,
  title       text not null,
  category    text,
  campus      text not null default 'all' check (campus in ('all', 'early-years', 'maiden-ln')),
  body        text not null default '',
  updated_at  timestamptz not null default now()
);

alter table public.hub_resources enable row level security;
revoke all on public.hub_resources from anon;

drop policy if exists "members read" on public.hub_resources;
create policy "members read" on public.hub_resources
  for select to authenticated using (public.is_hub_member());

drop policy if exists "managers write" on public.hub_resources;
create policy "managers write" on public.hub_resources
  for all to authenticated using (public.can_manage_staff()) with check (public.can_manage_staff());
