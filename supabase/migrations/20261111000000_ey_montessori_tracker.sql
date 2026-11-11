-- Early Years Montessori work tracker: the works (materials) by area, each
-- child's level on each work, and the observations guides log.
create table if not exists public.ey_works (
  id          bigint generated always as identity primary key,
  area        text not null check (area in ('pl', 'se', 'ma', 'la', 'sc')),
  name        text not null,
  description text,
  sort        int not null default 0,
  archived    boolean not null default false,
  updated_by  text,
  updated_at  timestamptz not null default now()
);

create table if not exists public.ey_work_status (
  student_id  bigint not null references public.students(id) on delete cascade,
  work_id     bigint not null references public.ey_works(id) on delete cascade,
  level       text not null check (level in ('N', 'E', 'D', 'I')),
  updated_by  text,
  updated_at  timestamptz not null default now(),
  primary key (student_id, work_id)
);

create table if not exists public.ey_observations (
  id          bigint generated always as identity primary key,
  student_id  bigint not null references public.students(id) on delete cascade,
  work_id     bigint references public.ey_works(id) on delete set null,
  day         date not null default ((now() at time zone 'America/New_York')::date),
  level       text check (level in ('N', 'E', 'D', 'I')),
  cycle       text check (cycle in ('brief', 'complete')),
  support     text check (support in ('self', 'invited', 'lesson')),
  note        text,
  highlight   boolean not null default false,
  by_email    text,
  by_name     text,
  created_at  timestamptz not null default now()
);
create index if not exists ey_observations_day_idx on public.ey_observations (day desc);
create index if not exists ey_observations_student_idx on public.ey_observations (student_id, day desc);

alter table public.ey_works enable row level security;
alter table public.ey_work_status enable row level security;
alter table public.ey_observations enable row level security;
-- Access rules: see 20261111000100_ey_tracker_access_and_photos.sql.
-- The starting list of 25 works was added as data, not in this file.
