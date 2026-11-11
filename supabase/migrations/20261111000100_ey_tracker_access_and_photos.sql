-- The Montessori tracker is only for approved people signed in with Google
-- (not the shared staff code). Admins are always approved.
alter table public.allowed_users add column if not exists tracker boolean not null default false;
update public.allowed_users set tracker = true where email = 'tarranum.malhi@alpha.school';

create or replace function public.can_use_tracker()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((auth.jwt() -> 'app_metadata' -> 'providers') ? 'google', false)
     and exists (
       select 1 from public.allowed_users u
       where u.email = lower(auth.jwt() ->> 'email') and (u.tracker or u.role = 'admin')
     )
$$;

drop policy if exists "members read" on public.ey_works;
drop policy if exists "members write" on public.ey_works;
drop policy if exists "members change" on public.ey_works;
drop policy if exists "members read" on public.ey_work_status;
drop policy if exists "members write" on public.ey_work_status;
drop policy if exists "members change" on public.ey_work_status;
drop policy if exists "members read" on public.ey_observations;
drop policy if exists "members write" on public.ey_observations;
drop policy if exists "members change" on public.ey_observations;
drop policy if exists "members clear" on public.ey_observations;

create policy "tracker read" on public.ey_works for select to authenticated using (public.can_use_tracker());
create policy "tracker write" on public.ey_works for insert to authenticated with check (public.can_use_tracker());
create policy "tracker change" on public.ey_works for update to authenticated using (public.can_use_tracker()) with check (public.can_use_tracker());
create policy "tracker read" on public.ey_work_status for select to authenticated using (public.can_use_tracker());
create policy "tracker write" on public.ey_work_status for insert to authenticated with check (public.can_use_tracker());
create policy "tracker change" on public.ey_work_status for update to authenticated using (public.can_use_tracker()) with check (public.can_use_tracker());
create policy "tracker read" on public.ey_observations for select to authenticated using (public.can_use_tracker());
create policy "tracker write" on public.ey_observations for insert to authenticated with check (public.can_use_tracker());
create policy "tracker change" on public.ey_observations for update to authenticated using (public.can_use_tracker()) with check (public.can_use_tracker());
create policy "tracker clear" on public.ey_observations for delete to authenticated using (public.can_use_tracker());

-- Photos and scans of children's work, private, attached to observations.
alter table public.ey_observations add column if not exists photos text[] not null default '{}';
alter table public.ey_observations add column if not exists ocr_text text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('ey-work', 'ey-work', false, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf'])
on conflict (id) do nothing;

create policy "tracker photos read" on storage.objects for select to authenticated using (bucket_id = 'ey-work' and public.can_use_tracker());
create policy "tracker photos add" on storage.objects for insert to authenticated with check (bucket_id = 'ey-work' and public.can_use_tracker());
create policy "tracker photos remove" on storage.objects for delete to authenticated using (bucket_id = 'ey-work' and public.can_use_tracker());
