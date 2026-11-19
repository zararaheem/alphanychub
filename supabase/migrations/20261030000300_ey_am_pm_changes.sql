-- Morning and dismissal changes are separate: a parent drop-off today doesn't
-- change how the child goes home. Absent is written to both. New one-day
-- choices: 'late' (morning) and 'early' (early pickup at dismissal).
alter table public.ey_travel_day add column if not exists part text not null default 'pm';
alter table public.ey_travel_day add constraint ey_travel_day_part_check check (part in ('am', 'pm'));
alter table public.ey_travel_day drop constraint ey_travel_day_pkey;
alter table public.ey_travel_day add primary key (student_id, day, part);
alter table public.ey_travel_day drop constraint ey_travel_day_mode_check;
alter table public.ey_travel_day add constraint ey_travel_day_mode_check check (
  (part = 'am' and mode in ('walker', 'bus', 'parent', 'late', 'absent'))
  or (part = 'pm' and mode in ('walker', 'bus', 'parent', 'afterschool', 'early', 'absent')));
insert into public.ey_travel_day (student_id, day, part, mode, note, updated_by, updated_at)
  select student_id, day, 'am', mode, note, updated_by, updated_at from public.ey_travel_day where mode = 'absent' and part = 'pm'
  on conflict do nothing;

drop function if exists public.ey_slack_set(text, bigint[], text, date, text, text, int[]);
drop function if exists public.ey_slack_roster(text, date);

create or replace function public.ey_slack_roster(p_token text, p_day date)
returns table (id bigint, first_name text, last_name text, usual text, afterschool_days int[], today text, today_am text, note text)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.ey_token_ok(p_token) then raise exception 'not allowed'; end if;
  return query
    select s.id, s.first_name, s.last_name, t.mode, coalesce(t.afterschool_days, '{}'), d.mode, a.mode, coalesce(d.note, a.note)
    from public.students s
    left join public.ey_travel t on t.student_id = s.id
    left join public.ey_travel_day d on d.student_id = s.id and d.day = p_day and d.part = 'pm'
    left join public.ey_travel_day a on a.student_id = s.id and a.day = p_day and a.part = 'am'
    where s.campus = 'early-years'
    order by s.first_name, s.last_name;
end $$;

-- p_day null: the usual way to and from school (walker/bus/parent) or, for
-- 'afterschool', the usual afterschool weekdays (p_days, 1 = Mon … 4 = Thu).
-- p_day set: a change for that morning ('am') or dismissal ('pm'); 'absent'
-- is the whole day, and 'usual' undoes the change (both parts if p_part is null).
create or replace function public.ey_slack_set(p_token text, p_ids bigint[], p_mode text, p_day date, p_by text, p_note text default null, p_days int[] default null, p_part text default 'pm')
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
    delete from public.ey_travel_day d where d.student_id = any(p_ids) and d.day = p_day and (p_part is null or d.part = p_part);
  else
    insert into public.ey_travel_day (student_id, day, part, mode, note, updated_by, updated_at)
      select s.id, p_day, x.part, p_mode, p_note, p_by, now()
      from public.students s
      cross join (select unnest(case when p_mode = 'absent' then array['am', 'pm'] else array[coalesce(p_part, 'pm')] end) as part) x
      where s.id = any(p_ids) and s.campus = 'early-years'
      on conflict (student_id, day, part) do update set mode = excluded.mode, note = excluded.note, updated_by = excluded.updated_by, updated_at = now();
  end if;
  get diagnostics n = row_count;
  return n;
end $$;

grant execute on function public.ey_slack_roster(text, date) to anon;
grant execute on function public.ey_slack_set(text, bigint[], text, date, text, text, int[], text) to anon;
