-- Slack functions with afterschool days. The token lives in app_secrets
-- (name 'ey_slack') and in Vercel as EY_SLACK_TOKEN; it is never committed.
drop function if exists public.ey_slack_set(text, bigint[], text, date, text, text);
drop function if exists public.ey_slack_roster(text, date);

create or replace function public.ey_slack_roster(p_token text, p_day date)
returns table (id bigint, first_name text, last_name text, usual text, afterschool_days int[], today text, note text)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.ey_token_ok(p_token) then raise exception 'not allowed'; end if;
  return query
    select s.id, s.first_name, s.last_name, t.mode, coalesce(t.afterschool_days, '{}'), d.mode, d.note
    from public.students s
    left join public.ey_travel t on t.student_id = s.id
    left join public.ey_travel_day d on d.student_id = s.id and d.day = p_day
    where s.campus = 'early-years'
    order by s.first_name, s.last_name;
end $$;

-- p_day null: set the usual way home (walker/bus/parent) or, for 'afterschool',
-- the usual afterschool weekdays (p_days, 1 = Mon … 4 = Thu; empty = none).
-- p_day set: a one-day change, or 'usual' to undo it.
create or replace function public.ey_slack_set(p_token text, p_ids bigint[], p_mode text, p_day date, p_by text, p_note text default null, p_days int[] default null)
returns integer language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  if not public.ey_token_ok(p_token) then raise exception 'not allowed'; end if;
  if p_day is null and p_mode = 'afterschool' then
    insert into public.ey_travel (student_id, afterschool_days, updated_by, updated_at)
      select s.id, coalesce(p_days, '{}'), p_by, now() from public.students s where s.id = any(p_ids) and s.campus = 'early-years'
      on conflict (student_id) do update set afterschool_days = excluded.afterschool_days, updated_by = excluded.updated_by, updated_at = now();
  elsif p_day is null then
    if p_mode not in ('walker', 'bus', 'parent') then raise exception 'bad mode'; end if;
    insert into public.ey_travel (student_id, mode, updated_by, updated_at)
      select s.id, p_mode, p_by, now() from public.students s where s.id = any(p_ids) and s.campus = 'early-years'
      on conflict (student_id) do update set mode = excluded.mode, updated_by = excluded.updated_by, updated_at = now();
  elsif p_mode = 'usual' then
    delete from public.ey_travel_day d where d.student_id = any(p_ids) and d.day = p_day;
  else
    if p_mode not in ('walker', 'bus', 'parent', 'afterschool', 'absent') then raise exception 'bad mode'; end if;
    insert into public.ey_travel_day (student_id, day, mode, note, updated_by, updated_at)
      select s.id, p_day, p_mode, p_note, p_by, now() from public.students s where s.id = any(p_ids) and s.campus = 'early-years'
      on conflict (student_id, day) do update set mode = excluded.mode, note = excluded.note, updated_by = excluded.updated_by, updated_at = now();
  end if;
  get diagnostics n = row_count;
  return n;
end $$;

grant execute on function public.ey_slack_roster(text, date) to anon;
grant execute on function public.ey_slack_set(text, bigint[], text, date, text, text, int[]) to anon;
