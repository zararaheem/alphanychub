-- Requests from the Parent Hub and from staff, plus every question asked in
-- the hub assistant, so admins can see what people need and adapt content.

create table if not exists public.requests (
  id          bigint generated always as identity primary key,
  created_at  timestamptz not null default now(),
  source      text not null check (source in ('parent', 'staff', 'preview')),
  kind        text not null,
  campus      text,
  student     text,
  from_name   text,
  from_email  text not null,
  details     jsonb not null default '{}'::jsonb,
  route_to    text,
  status      text not null default 'new' check (status in ('new', 'in-progress', 'done')),
  staff_note  text,
  updated_by  text,
  updated_at  timestamptz
);
create index if not exists requests_created_idx on public.requests (created_at desc);
create index if not exists requests_from_idx on public.requests (lower(from_email));

alter table public.requests enable row level security;
revoke all on public.requests from anon;

-- Editors (Admins, Campus Coordinators, Lead Guides) see and work every request;
-- staff see the ones they sent. Parent requests are written server-side.
drop policy if exists "editors or sender read" on public.requests;
create policy "editors or sender read" on public.requests
  for select to authenticated
  using (public.can_edit_hub() or lower(from_email) = lower(auth.jwt() ->> 'email'));

drop policy if exists "members send their own" on public.requests;
create policy "members send their own" on public.requests
  for insert to authenticated
  with check (public.is_hub_member() and source in ('staff', 'preview') and lower(from_email) = lower(auth.jwt() ->> 'email'));

drop policy if exists "editors update" on public.requests;
create policy "editors update" on public.requests
  for update to authenticated using (public.can_edit_hub()) with check (public.can_edit_hub());

create table if not exists public.ask_log (
  id          bigint generated always as identity primary key,
  created_at  timestamptz not null default now(),
  email       text not null,
  question    text not null,
  answer      text,
  answered    boolean not null default true,
  helpful     boolean
);
create index if not exists ask_log_created_idx on public.ask_log (created_at desc);

alter table public.ask_log enable row level security;
revoke all on public.ask_log from anon;

drop policy if exists "members log their own" on public.ask_log;
create policy "members log their own" on public.ask_log
  for insert to authenticated
  with check (public.is_hub_member() and lower(email) = lower(auth.jwt() ->> 'email'));

drop policy if exists "editors or asker read" on public.ask_log;
create policy "editors or asker read" on public.ask_log
  for select to authenticated
  using (public.can_edit_hub() or lower(email) = lower(auth.jwt() ->> 'email'));

drop policy if exists "asker rates" on public.ask_log;
create policy "asker rates" on public.ask_log
  for update to authenticated
  using (lower(email) = lower(auth.jwt() ->> 'email'))
  with check (lower(email) = lower(auth.jwt() ->> 'email'));

-- One-time sign-in codes for the Parent Hub. Server-side (service role) only.
create table if not exists public.parent_hub_codes (
  email       text primary key,
  code_hash   text not null,
  expires_at  timestamptz not null,
  attempts    int not null default 0,
  sent_at     timestamptz not null default now()
);
alter table public.parent_hub_codes enable row level security;
revoke all on public.parent_hub_codes from anon, authenticated;
