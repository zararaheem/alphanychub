-- Student medication records (replaces the separate campusresources tool).
-- Everyone on the access list reads (guides give the doses); Admins and
-- Campus Coordinators add, edit and remove.
create table if not exists public.student_medications (
  id            bigint generated always as identity primary key,
  student       text not null,
  level         text,
  campus        text not null default 'maiden-ln' check (campus in ('early-years', 'maiden-ln')),
  medication    text not null,
  dose          text,
  route         text,
  schedule      text not null default 'Every school day',
  times         text,
  storage       text,
  instructions  text,
  active        boolean not null default true,
  updated_at    timestamptz not null default now()
);

alter table public.student_medications enable row level security;
revoke all on public.student_medications from anon;

drop policy if exists "members read" on public.student_medications;
create policy "members read" on public.student_medications
  for select to authenticated using (public.is_hub_member());

drop policy if exists "managers write" on public.student_medications;
create policy "managers write" on public.student_medications
  for all to authenticated using (public.can_manage_staff()) with check (public.can_manage_staff());
