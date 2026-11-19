-- Password-protected links that let a family open their child's weekly
-- report without an account. Only a hash of the password is stored.
create table if not exists public.ey_report_shares (
  token        uuid primary key default gen_random_uuid(),
  student_id   bigint not null references public.students(id) on delete cascade,
  period_start date not null,
  pass_hash    text not null,
  attempts     int not null default 0,
  created_by   text,
  created_at   timestamptz not null default now(),
  expires_at   timestamptz not null default now() + interval '60 days',
  revoked      boolean not null default false
);
alter table public.ey_report_shares enable row level security;
create policy "tracker read" on public.ey_report_shares for select to authenticated using (public.can_use_tracker());
create policy "tracker change" on public.ey_report_shares for update to authenticated using (public.can_use_tracker()) with check (public.can_use_tracker());

-- A guide creates a share; the password is hashed here and never stored.
create or replace function public.ey_create_share(p_student bigint, p_period date, p_password text, p_by text)
returns uuid language plpgsql security definer set search_path = public, extensions as $$
declare t uuid;
begin
  if not public.can_use_tracker() then raise exception 'not allowed'; end if;
  if length(coalesce(p_password, '')) < 8 then raise exception 'password too short'; end if;
  insert into public.ey_report_shares (student_id, period_start, pass_hash, created_by)
  values (p_student, p_period, extensions.crypt(p_password, extensions.gen_salt('bf', 8)), p_by)
  returning token into t;
  return t;
end $$;
grant execute on function public.ey_create_share(bigint, date, text, text) to authenticated;

-- A family opens a share with its password. Returns only what the report
-- needs. Ten wrong passwords lock the link.
create or replace function public.ey_open_share(p_token uuid, p_password text)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare s public.ey_report_shares; fri date;
begin
  select * into s from public.ey_report_shares where token = p_token;
  if not found or s.revoked or s.expires_at < now() then return jsonb_build_object('error', 'gone'); end if;
  if s.attempts >= 10 then return jsonb_build_object('error', 'locked'); end if;
  if extensions.crypt(coalesce(p_password, ''), s.pass_hash) <> s.pass_hash then
    update public.ey_report_shares set attempts = attempts + 1 where token = p_token;
    return jsonb_build_object('error', 'password');
  end if;
  fri := s.period_start + 4;
  return jsonb_build_object(
    'monday', s.period_start,
    'kid', (select to_jsonb(k) from (select id, first_name, last_name, grade from public.students where id = s.student_id) k),
    'obs', coalesce((select jsonb_agg(to_jsonb(o) - 'by_email' order by o.created_at) from public.ey_observations o
                     where o.student_id = s.student_id and o.day between s.period_start and fri), '[]'),
    'works', coalesce((select jsonb_agg(jsonb_build_object('id', w.id, 'name', w.name, 'area', w.area)) from public.ey_works w
                       where w.id in (select work_id from public.ey_observations o where o.student_id = s.student_id and o.day between s.period_start and fri)), '[]'),
    'skills', coalesce((select jsonb_agg(jsonb_build_object('id', k.id, 'code', k.code, 'domain', k.domain, 'name', k.name, 'ican', k.ican, 'home_support', k.home_support, 'archived', k.archived, 'sort', k.sort) order by k.sort)
                        from public.ey_skills k), '[]'),
    'levels', coalesce((select jsonb_object_agg(skill_id::text, level) from public.ey_skill_status where student_id = s.student_id), '{}'),
    'note', (select note from public.ey_report_notes where student_id = s.student_id and period_start = s.period_start)
  );
end $$;
grant execute on function public.ey_open_share(uuid, text) to anon, authenticated;
