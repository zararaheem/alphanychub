-- The tracker owner (stored in app_secrets as 'tracker_owner', set directly in the
-- database, not in code) is the only person who sees the activity log and who can
-- give or remove tracker access or set someone's class.

create or replace function public.is_tracker_owner()
returns boolean language sql stable security definer set search_path = public as $$
  select public.current_email() <> '' and exists (
    select 1 from public.app_secrets where name = 'tracker_owner' and lower(value) = public.current_email());
$$;
revoke execute on function public.is_tracker_owner() from public, anon;
grant execute on function public.is_tracker_owner() to authenticated;

alter policy "superadmins read the activity log" on public.ey_activity using (public.is_tracker_owner());

create or replace function public.ey_guard_tracker_access()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if public.current_email() = '' or public.is_tracker_owner() then return new; end if;
  if tg_op = 'INSERT' and coalesce(new.tracker, false) then
    raise exception 'Only the tracker owner can give tracker access';
  end if;
  if tg_op = 'UPDATE' and (new.tracker is distinct from old.tracker or new.ey_class is distinct from old.ey_class) then
    raise exception 'Only the tracker owner can change tracker access';
  end if;
  return new;
end $$;
revoke execute on function public.ey_guard_tracker_access() from public, anon, authenticated;
create or replace trigger ey_guard_tracker_access before insert or update on public.allowed_users
  for each row execute function public.ey_guard_tracker_access();
