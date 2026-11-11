-- Early Years attendance: how each child gets to and from William St
-- (walker via Maiden Ln, bus, or parent), one-day changes, and the taps staff
-- make in the morning and at dismissal. Staff use the app at /ey; Slack's
-- /ey command reads and writes through the two token-checked functions below.

create table if not exists public.ey_travel (
  student_id  bigint primary key references public.students(id) on delete cascade,
  mode        text not null check (mode in ('walker', 'bus', 'parent')),
  updated_by  text,
  updated_at  timestamptz not null default now()
);

create table if not exists public.ey_travel_day (
  student_id  bigint not null references public.students(id) on delete cascade,
  day         date not null,
  mode        text not null check (mode in ('walker', 'bus', 'parent', 'absent')),
  note        text,
  updated_by  text,
  updated_at  timestamptz not null default now(),
  primary key (student_id, day)
);

-- am_maiden: walker checked in at Maiden Ln (8:30) · am_here: at William St
-- pm_left: walker left William St (3:15) · pm_done: back at Maiden Ln / on bus / picked up
create table if not exists public.ey_checks (
  student_id  bigint not null references public.students(id) on delete cascade,
  day         date not null,
  step        text not null check (step in ('am_maiden', 'am_here', 'pm_left', 'pm_done')),
  by_email    text,
  at          timestamptz not null default now(),
  primary key (student_id, day, step)
);

alter table public.ey_travel enable row level security;
alter table public.ey_travel_day enable row level security;
alter table public.ey_checks enable row level security;

create policy "members read" on public.ey_travel for select to authenticated using (public.is_hub_member());
create policy "members write" on public.ey_travel for insert to authenticated with check (public.is_hub_member());
create policy "members change" on public.ey_travel for update to authenticated using (public.is_hub_member()) with check (public.is_hub_member());
create policy "members clear" on public.ey_travel for delete to authenticated using (public.is_hub_member());

create policy "members read" on public.ey_travel_day for select to authenticated using (public.is_hub_member());
create policy "members write" on public.ey_travel_day for insert to authenticated with check (public.is_hub_member());
create policy "members change" on public.ey_travel_day for update to authenticated using (public.is_hub_member()) with check (public.is_hub_member());
create policy "members clear" on public.ey_travel_day for delete to authenticated using (public.is_hub_member());

create policy "members read" on public.ey_checks for select to authenticated using (public.is_hub_member());
create policy "members write" on public.ey_checks for insert to authenticated with check (public.is_hub_member());
create policy "members clear" on public.ey_checks for delete to authenticated using (public.is_hub_member());

-- Server-only secrets: RLS on and no policies, so nobody reads it through the API.
create table if not exists public.app_secrets (name text primary key, value text not null);
alter table public.app_secrets enable row level security;

create or replace function public.ey_token_ok(p_token text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.app_secrets where name = 'ey_slack' and value = p_token and length(p_token) >= 32)
$$;

-- Early Years roster with each child's usual mode and any change for p_day.
create or replace function public.ey_slack_roster(p_token text, p_day date)
returns table (id bigint, first_name text, last_name text, usual text, today text, note text)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.ey_token_ok(p_token) then raise exception 'not allowed'; end if;
  return query
    select s.id, s.first_name, s.last_name, t.mode, d.mode, d.note
    from public.students s
    left join public.ey_travel t on t.student_id = s.id
    left join public.ey_travel_day d on d.student_id = s.id and d.day = p_day
    where s.campus = 'early-years'
    order by s.first_name, s.last_name;
end $$;

-- Sets the usual mode (p_day null) or a one-day change for Early Years children.
create or replace function public.ey_slack_set(p_token text, p_ids bigint[], p_mode text, p_day date, p_by text, p_note text default null)
returns integer language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  if not public.ey_token_ok(p_token) then raise exception 'not allowed'; end if;
  if p_day is null then
    if p_mode not in ('walker', 'bus', 'parent') then raise exception 'bad mode'; end if;
    insert into public.ey_travel (student_id, mode, updated_by, updated_at)
      select s.id, p_mode, p_by, now() from public.students s where s.id = any(p_ids) and s.campus = 'early-years'
      on conflict (student_id) do update set mode = excluded.mode, updated_by = excluded.updated_by, updated_at = now();
  elsif p_mode = 'usual' then
    delete from public.ey_travel_day d where d.student_id = any(p_ids) and d.day = p_day;
  else
    if p_mode not in ('walker', 'bus', 'parent', 'absent') then raise exception 'bad mode'; end if;
    insert into public.ey_travel_day (student_id, day, mode, note, updated_by, updated_at)
      select s.id, p_day, p_mode, p_note, p_by, now() from public.students s where s.id = any(p_ids) and s.campus = 'early-years'
      on conflict (student_id, day) do update set mode = excluded.mode, note = excluded.note, updated_by = excluded.updated_by, updated_at = now();
  end if;
  get diagnostics n = row_count;
  return n;
end $$;

grant execute on function public.ey_slack_roster(text, date) to anon;
grant execute on function public.ey_slack_set(text, bigint[], text, date, text, text) to anon;
