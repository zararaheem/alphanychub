-- Parent contacts are limited to staff an admin approves (plus Admins and Campus Coordinators).
alter table public.allowed_users add column if not exists can_see_parents boolean not null default false;

create or replace function public.can_see_parents()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.allowed_users
    where email = public.current_email() and (role in ('admin', 'coordinator') or can_see_parents)
  );
$$;
revoke all on function public.can_see_parents() from public;
grant execute on function public.can_see_parents() to authenticated;

drop policy if exists "members read" on public.parent_contacts;
drop policy if exists "approved staff read" on public.parent_contacts;
create policy "approved staff read" on public.parent_contacts
  for select to authenticated using (public.can_see_parents());

-- Only Admins and Campus Coordinators replace the parent list.
drop policy if exists "editors write" on public.parent_contacts;
drop policy if exists "managers write" on public.parent_contacts;
create policy "managers write" on public.parent_contacts
  for all to authenticated using (public.can_manage_staff()) with check (public.can_manage_staff());
