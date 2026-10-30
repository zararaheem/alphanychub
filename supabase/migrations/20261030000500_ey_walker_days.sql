-- Walkers can vary by day: walker_days (1 = Mon … 5 = Fri) are the days a
-- child walks via Maiden Ln; other days they travel their usual way.
alter table public.ey_travel add column if not exists walker_days int[] not null default '{}';

create or replace function public.ey_roster2(p_token text, p_day date)
returns table (id bigint, first_name text, last_name text, usual text, afterschool_days int[], walker_days int[], today text, today_am text, note text, grade text, bus_route text)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.ey_token_ok(p_token) then raise exception 'not allowed'; end if;
  return query
    select s.id, s.first_name, s.last_name, t.mode, coalesce(t.afterschool_days, '{}'), coalesce(t.walker_days, '{}'), d.mode, a.mode, coalesce(d.note, a.note), s.grade, t.bus_route
    from public.students s
    left join public.ey_travel t on t.student_id = s.id
    left join public.ey_travel_day d on d.student_id = s.id and d.day = p_day and d.part = 'pm'
    left join public.ey_travel_day a on a.student_id = s.id and a.day = p_day and a.part = 'am'
    where s.campus = 'early-years'
    order by s.first_name, s.last_name;
end $$;
grant execute on function public.ey_roster2(text, date) to anon;

create or replace function public.ey_set_walker_days(p_token text, p_ids bigint[], p_days int[], p_by text)
returns integer language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  if not public.ey_token_ok(p_token) then raise exception 'not allowed'; end if;
  insert into public.ey_travel (student_id, walker_days, updated_by, updated_at)
    select s.id, coalesce(p_days, '{}'), p_by, now() from public.students s where s.id = any(p_ids) and s.campus = 'early-years'
    on conflict (student_id) do update set walker_days = excluded.walker_days, updated_by = excluded.updated_by, updated_at = now();
  get diagnostics n = row_count;
  return n;
end $$;
grant execute on function public.ey_set_walker_days(text, bigint[], int[], text) to anon;
