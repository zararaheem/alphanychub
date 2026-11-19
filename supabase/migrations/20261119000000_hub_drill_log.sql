-- Fire, lockdown, evacuation and shelter-in-place drills: when, how long,
-- whether every student was accounted for, and what to fix.
create table if not exists public.hub_drills (
  id bigint generated always as identity primary key,
  campus text not null check (campus in ('maiden-ln', 'early-years')),
  kind text not null check (kind in ('fire', 'lockdown', 'evacuation', 'shelter', 'other')),
  held_on date not null,
  minutes int check (minutes between 0 and 240),
  headcount int check (headcount >= 0),
  all_accounted boolean not null default true,
  went_well text,
  to_fix text,
  logged_by text,
  created_at timestamptz not null default now()
);
create index if not exists hub_drills_held on public.hub_drills (held_on desc);
alter table public.hub_drills enable row level security;
revoke all on public.hub_drills from anon;
grant select, insert, update, delete on public.hub_drills to authenticated;
create policy "staff read drills" on public.hub_drills for select to authenticated using (public.is_hub_member());
create policy "staff log drills" on public.hub_drills for insert to authenticated with check (public.is_hub_member());
create policy "editors fix drills" on public.hub_drills for update to authenticated using (public.can_edit_hub()) with check (public.can_edit_hub());
create policy "editors remove drills" on public.hub_drills for delete to authenticated using (public.can_edit_hub());
