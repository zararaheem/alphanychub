-- Parent / guardian contacts, imported from a Google Sheet CSV export.
-- Only people on the access list can read them; admins and Lead Guides import.
create table if not exists public.parent_contacts (
  id            bigint generated always as identity primary key,
  campus        text not null check (campus in ('early-years', 'maiden-ln')),
  student       text not null,
  grade         text,
  guardian      text,
  relationship  text,
  phone         text,
  email         text,
  notes         text,
  sort          int not null default 0,
  imported_at   timestamptz not null default now()
);

alter table public.parent_contacts enable row level security;
revoke all on public.parent_contacts from anon;

drop policy if exists "members read" on public.parent_contacts;
create policy "members read" on public.parent_contacts
  for select to authenticated using (public.is_hub_member());

drop policy if exists "editors write" on public.parent_contacts;
create policy "editors write" on public.parent_contacts
  for all to authenticated using (public.can_edit_hub()) with check (public.can_edit_hub());
