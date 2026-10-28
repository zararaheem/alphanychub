-- Campus Coordinator: edits everything like an Admin, but cannot manage the access list.
alter table public.allowed_users drop constraint if exists allowed_users_role_check;
alter table public.allowed_users
  add constraint allowed_users_role_check check (role in ('admin', 'coordinator', 'lead', 'guide', 'staff'));

create or replace function public.can_edit_hub()
returns boolean
language sql
stable
as $$
  select coalesce(public.hub_role() in ('admin', 'coordinator', 'lead'), false);
$$;
