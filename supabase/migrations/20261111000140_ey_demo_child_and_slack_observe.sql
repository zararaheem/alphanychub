-- A demo child for the Montessori tracker: campus 'demo' keeps them out of
-- attendance, class lists and staff counts, which all filter by real campus.
alter table public.students drop constraint students_campus_check;
alter table public.students add constraint students_campus_check check (campus in ('early-years', 'maiden-ln', 'demo'));
insert into public.students (first_name, last_name, grade, level, campus)
select 'Demo', 'Child', 'PK', 'Wonder Lab', 'demo'
where not exists (select 1 from public.students where campus = 'demo');

drop function if exists public.ey_kb_load(text, jsonb, jsonb, jsonb);

-- Slack /ey: record a lesson or a note for Early Years children (token-checked).
create or replace function public.ey_slack_observe(p_token text, p_ids bigint[], p_work bigint, p_level text, p_note text, p_by text)
returns integer language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  if not public.ey_token_ok(p_token) then raise exception 'not allowed'; end if;
  if p_level is not null and p_level not in ('I', 'P', 'M') then raise exception 'bad level'; end if;
  insert into public.ey_observations (student_id, work_id, level, note, by_name)
    select s.id, p_work, p_level, nullif(trim(p_note), ''), p_by from public.students s
    where s.id = any(p_ids) and s.campus in ('early-years', 'demo');
  get diagnostics n = row_count;
  if p_work is not null and p_level is not null then
    insert into public.ey_work_status (student_id, work_id, level, updated_by)
      select s.id, p_work, p_level, p_by from public.students s where s.id = any(p_ids) and s.campus in ('early-years', 'demo')
      on conflict (student_id, work_id) do update set level = excluded.level, updated_by = excluded.updated_by, updated_at = now();
  end if;
  return n;
end $$;
grant execute on function public.ey_slack_observe(text, bigint[], bigint, text, text, text) to anon;

create or replace function public.ey_slack_works(p_token text)
returns table (id bigint, name text, area text)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.ey_token_ok(p_token) then raise exception 'not allowed'; end if;
  return query select w.id, w.name, w.area from public.ey_works w where not w.archived;
end $$;
grant execute on function public.ey_slack_works(text) to anon;
