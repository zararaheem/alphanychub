-- Activity log for the Early Years tracker and attendance: every add, change and
-- removal, who did it and when. Only superadmins can read it; nobody can edit it.

create table if not exists public.ey_activity (
  id bigserial primary key,
  at timestamptz not null default now(),
  actor text not null,
  action text not null check (action in ('added', 'changed', 'removed')),
  table_name text not null,
  row_key text,
  student_id bigint,
  details jsonb not null default '{}'::jsonb
);
create index if not exists ey_activity_at on public.ey_activity (at desc);
create index if not exists ey_activity_student on public.ey_activity (student_id, at desc);

alter table public.ey_activity enable row level security;
revoke all on public.ey_activity from anon, authenticated;
grant select on public.ey_activity to authenticated;
create policy "superadmins read the activity log" on public.ey_activity
  for select to authenticated using (public.hub_role() = 'admin');

create or replace function public.ey_log_change()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  j jsonb := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  o jsonb := case when tg_op = 'UPDATE' then to_jsonb(old) else null end;
  d jsonb := '{}'::jsonb;
  k text;
begin
  j := j - 'pass_hash';
  if tg_op = 'UPDATE' then
    for k in select jsonb_object_keys(j) loop
      if (o -> k) is distinct from (j -> k) and k not in ('updated_at') then
        d := d || jsonb_build_object(k, jsonb_build_array(o -> k, j -> k));
      end if;
    end loop;
    if d = '{}'::jsonb then return null; end if;
  else
    d := j;
  end if;
  insert into public.ey_activity (actor, action, table_name, row_key, student_id, details)
  values (
    coalesce(nullif(public.current_email(), ''), j ->> 'by_email', j ->> 'updated_by', j ->> 'by_name', j ->> 'by', 'system'),
    case tg_op when 'INSERT' then 'added' when 'UPDATE' then 'changed' else 'removed' end,
    tg_table_name,
    coalesce(j ->> 'id', j ->> 'token', j ->> 'email'),
    case when j ? 'student_id' then nullif(j ->> 'student_id', '')::bigint else null end,
    d
  );
  return null;
end $$;
revoke execute on function public.ey_log_change() from public, anon, authenticated;

do $$
declare t text;
begin
  foreach t in array array['ey_observations', 'ey_work_status', 'ey_skill_status', 'ey_works', 'ey_skills',
    'ey_skill_works', 'ey_report_notes', 'ey_report_shares', 'ey_travel', 'ey_travel_day', 'ey_checks', 'allowed_users']
  loop
    execute format('create or replace trigger ey_activity_log after insert or update or delete on public.%I
      for each row execute function public.ey_log_change()', t);
  end loop;
end $$;
