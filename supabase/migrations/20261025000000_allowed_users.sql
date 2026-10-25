-- Access list for the hub. Only people listed here can use the app after
-- signing in with Google; everyone else lands on /no-access.
--
-- Roles:
--   admin  – manages the access list, sees every tab
--   lead   – Lead Guide: sees the Early Years lead dashboard
--   guide  – Pre-K / Kinder Guide
--   staff  – other staff

create table if not exists public.allowed_users (
  email       text primary key check (email = lower(email)),
  role        text not null default 'guide' check (role in ('admin', 'lead', 'guide', 'staff')),
  name        text,
  added_by    text,
  created_at  timestamptz not null default now()
);

alter table public.allowed_users enable row level security;

-- The signed-in user's email, lower-cased, from their Supabase JWT.
create or replace function public.current_email()
returns text
language sql
stable
as $$
  select lower(coalesce(auth.jwt() ->> 'email', ''));
$$;

-- security definer so the policies below can check the table without
-- recursing through its own RLS.
create or replace function public.is_hub_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.allowed_users
    where email = public.current_email() and role = 'admin'
  );
$$;

revoke all on function public.is_hub_admin() from public;
grant execute on function public.is_hub_admin() to authenticated;

-- Anyone signed in can see their own row (that is how the app checks access).
drop policy if exists "read own row" on public.allowed_users;
create policy "read own row" on public.allowed_users
  for select to authenticated
  using (email = public.current_email());

-- Admins can see and manage everyone.
drop policy if exists "admins read all" on public.allowed_users;
create policy "admins read all" on public.allowed_users
  for select to authenticated
  using (public.is_hub_admin());

drop policy if exists "admins insert" on public.allowed_users;
create policy "admins insert" on public.allowed_users
  for insert to authenticated
  with check (public.is_hub_admin());

drop policy if exists "admins update" on public.allowed_users;
create policy "admins update" on public.allowed_users
  for update to authenticated
  using (public.is_hub_admin())
  with check (public.is_hub_admin());

-- Admins cannot delete their own row, so the list can't be locked out by accident.
drop policy if exists "admins delete" on public.allowed_users;
create policy "admins delete" on public.allowed_users
  for delete to authenticated
  using (public.is_hub_admin() and email <> public.current_email());

-- Nobody outside the authenticated role touches this table.
revoke all on public.allowed_users from anon;
