-- Knowledge base for the Montessori tracker, from the Montessori-Inspired
-- PreK Crosswalk (lessons) and the Wonder Lab Success Indicators (skills).
-- Lesson levels follow the crosswalk: Introduced / Practiced / Mastered.
-- (Applied to the live database on Nov 11; saved here for the record.)

delete from public.ey_works;  -- the 25 starter works; nothing was logged against them

alter table public.ey_works
  add column if not exists strand text,
  add column if not exists direct_aim text,
  add column if not exists indirect_aims text,
  add column if not exists elof text,
  add column if not exists common_core text,
  add column if not exists evidence text,
  add column if not exists ai_skills text,
  add column if not exists checks text,
  add column if not exists intro_min numeric,
  add column if not exists practice_min numeric,
  add column if not exists map_area text;

alter table public.ey_work_status drop constraint ey_work_status_level_check;
alter table public.ey_work_status add constraint ey_work_status_level_check check (level in ('I', 'P', 'M'));
alter table public.ey_observations drop constraint ey_observations_level_check;
alter table public.ey_observations add constraint ey_observations_level_check check (level in ('I', 'P', 'M'));

create table if not exists public.ey_skills (
  id           bigint generated always as identity primary key,
  code         text not null unique,
  domain       text not null check (domain in ('ATL', 'SE', 'LL', 'COG', 'PMP')),
  sub          text,
  name         text not null,
  indicator    text,
  floor        text,
  benchmark    text,
  stretch      text,
  ican         text,
  home_support text,
  elof         text,
  checks       text[] not null default '{}',
  tension      text,
  sort         int not null default 0,
  archived     boolean not null default false,
  updated_by   text,
  updated_at   timestamptz not null default now()
);

create table if not exists public.ey_skill_works (
  skill_id bigint not null references public.ey_skills(id) on delete cascade,
  work_id  bigint not null references public.ey_works(id) on delete cascade,
  primary key (skill_id, work_id)
);

create table if not exists public.ey_skill_status (
  student_id bigint not null references public.students(id) on delete cascade,
  skill_id   bigint not null references public.ey_skills(id) on delete cascade,
  level      text not null check (level in ('U', 'E', 'D', 'P')),
  note       text,
  updated_by text,
  updated_at timestamptz not null default now(),
  primary key (student_id, skill_id)
);

-- A guide's message for a child's parent report, per reporting period.
create table if not exists public.ey_report_notes (
  student_id   bigint not null references public.students(id) on delete cascade,
  period_start date not null,
  note         text,
  updated_by   text,
  updated_at   timestamptz not null default now(),
  primary key (student_id, period_start)
);

alter table public.ey_skills enable row level security;
alter table public.ey_skill_works enable row level security;
alter table public.ey_skill_status enable row level security;
alter table public.ey_report_notes enable row level security;

create policy "tracker read" on public.ey_skills for select to authenticated using (public.can_use_tracker());
create policy "tracker write" on public.ey_skills for insert to authenticated with check (public.can_use_tracker());
create policy "tracker change" on public.ey_skills for update to authenticated using (public.can_use_tracker()) with check (public.can_use_tracker());
create policy "tracker read" on public.ey_skill_works for select to authenticated using (public.can_use_tracker());
create policy "tracker write" on public.ey_skill_works for insert to authenticated with check (public.can_use_tracker());
create policy "tracker clear" on public.ey_skill_works for delete to authenticated using (public.can_use_tracker());
create policy "tracker read" on public.ey_skill_status for select to authenticated using (public.can_use_tracker());
create policy "tracker write" on public.ey_skill_status for insert to authenticated with check (public.can_use_tracker());
create policy "tracker change" on public.ey_skill_status for update to authenticated using (public.can_use_tracker()) with check (public.can_use_tracker());
create policy "tracker read" on public.ey_report_notes for select to authenticated using (public.can_use_tracker());
create policy "tracker write" on public.ey_report_notes for insert to authenticated with check (public.can_use_tracker());
create policy "tracker change" on public.ey_report_notes for update to authenticated using (public.can_use_tracker()) with check (public.can_use_tracker());
-- The lessons and skills themselves were loaded once with a token-gated
-- loader (ey_kb_load), since removed.
