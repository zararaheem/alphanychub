-- Hub content: emergency contacts and procedures, off-campus trips and
-- planning workshops, for both campuses. Every table is readable only by
-- people on the access list (public.allowed_users).
--
-- campus: 'maiden-ln' | 'early-years' | 'all' (applies to both)

create or replace function public.hub_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.allowed_users where email = public.current_email();
$$;

revoke all on function public.hub_role() from public;
grant execute on function public.hub_role() to authenticated;

-- Admins and Lead Guides edit reference content; everyone on the list reads it.
create or replace function public.can_edit_hub()
returns boolean
language sql
stable
as $$
  select coalesce(public.hub_role() in ('admin', 'lead'), false);
$$;

create or replace function public.is_hub_member()
returns boolean
language sql
stable
as $$
  select public.hub_role() is not null;
$$;

-- Emergency contacts ---------------------------------------------------------
create table if not exists public.emergency_contacts (
  id          bigint generated always as identity primary key,
  campus      text not null default 'all' check (campus in ('maiden-ln', 'early-years', 'all')),
  name        text not null,
  role        text,
  phone       text,
  email       text,
  notes       text,
  sort        int not null default 0,
  created_at  timestamptz not null default now()
);

-- Emergency procedures -------------------------------------------------------
create table if not exists public.emergency_procedures (
  id          bigint generated always as identity primary key,
  campus      text not null default 'all' check (campus in ('maiden-ln', 'early-years', 'all')),
  title       text not null,
  body        text not null default '',
  sort        int not null default 0,
  updated_at  timestamptz not null default now()
);

-- Off-campus tracker ---------------------------------------------------------
create table if not exists public.off_campus_trips (
  id           bigint generated always as identity primary key,
  campus       text not null check (campus in ('maiden-ln', 'early-years')),
  trip_date    date not null,
  depart_time  time,
  return_time  time,
  destination  text not null,
  group_name   text,
  lead_staff   text,
  headcount    int,
  transport    text,
  status       text not null default 'planned' check (status in ('planned', 'approved', 'out', 'returned', 'cancelled')),
  notes        text,
  created_by   text default public.current_email(),
  created_at   timestamptz not null default now()
);

-- Planning workshops ---------------------------------------------------------
create table if not exists public.workshops (
  id          bigint generated always as identity primary key,
  campus      text not null default 'all' check (campus in ('maiden-ln', 'early-years', 'all')),
  day         date not null,
  start_time  time,
  end_time    time,
  topic       text not null,
  notes       text,
  created_at  timestamptz not null default now()
);

-- RLS ------------------------------------------------------------------------
alter table public.emergency_contacts   enable row level security;
alter table public.emergency_procedures enable row level security;
alter table public.off_campus_trips     enable row level security;
alter table public.workshops            enable row level security;

revoke all on public.emergency_contacts, public.emergency_procedures,
  public.off_campus_trips, public.workshops from anon;

do $$
declare t text;
begin
  foreach t in array array['emergency_contacts', 'emergency_procedures', 'workshops'] loop
    execute format('drop policy if exists "members read" on public.%I', t);
    execute format('create policy "members read" on public.%I for select to authenticated using (public.is_hub_member())', t);
    execute format('drop policy if exists "editors write" on public.%I', t);
    execute format('create policy "editors write" on public.%I for all to authenticated using (public.can_edit_hub()) with check (public.can_edit_hub())', t);
  end loop;
end $$;

-- Any member can log and update trips; only editors can delete them.
drop policy if exists "members read" on public.off_campus_trips;
create policy "members read" on public.off_campus_trips
  for select to authenticated using (public.is_hub_member());
drop policy if exists "members insert" on public.off_campus_trips;
create policy "members insert" on public.off_campus_trips
  for insert to authenticated with check (public.is_hub_member());
drop policy if exists "members update" on public.off_campus_trips;
create policy "members update" on public.off_campus_trips
  for update to authenticated using (public.is_hub_member()) with check (public.is_hub_member());
drop policy if exists "editors delete" on public.off_campus_trips;
create policy "editors delete" on public.off_campus_trips
  for delete to authenticated using (public.can_edit_hub());

-- Seed: all-staff planning workshops, week of Oct 26 2026 ---------------------
insert into public.workshops (campus, day, start_time, end_time, topic)
select * from (values
  ('all', date '2026-10-26', time '07:45', time '08:05', 'Session 2 workshops by procedure'),
  ('all', date '2026-10-27', time '07:45', time '08:05', 'Drills and security, with a practice run'),
  ('all', date '2026-10-28', time '07:45', time '08:05', 'Off-campus trips and transportation'),
  ('all', date '2026-10-29', time '07:45', time '08:05', 'Approvals: vendors, waivers, space design'),
  ('all', date '2026-10-30', time '07:45', time '08:05', 'Drop off, pick up, attendance, then guide sub plans'),
  ('all', date '2026-11-02', null,         null,         'Emporium preview')
) as v(campus, day, start_time, end_time, topic)
where not exists (select 1 from public.workshops);
