-- Bus routes (East & Midtown, West Side, Downtown & Village, Separate) and a
-- roster function that also returns grade and route for Slack.
alter table public.ey_travel add column if not exists bus_route text;

create or replace function public.ey_roster(p_token text, p_day date)
returns table (id bigint, first_name text, last_name text, usual text, afterschool_days int[], today text, today_am text, note text, grade text, bus_route text)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.ey_token_ok(p_token) then raise exception 'not allowed'; end if;
  return query
    select s.id, s.first_name, s.last_name, t.mode, coalesce(t.afterschool_days, '{}'), d.mode, a.mode, coalesce(d.note, a.note), s.grade, t.bus_route
    from public.students s
    left join public.ey_travel t on t.student_id = s.id
    left join public.ey_travel_day d on d.student_id = s.id and d.day = p_day and d.part = 'pm'
    left join public.ey_travel_day a on a.student_id = s.id and a.day = p_day and a.part = 'am'
    where s.campus = 'early-years'
    order by s.first_name, s.last_name;
end $$;
grant execute on function public.ey_roster(text, date) to anon;
