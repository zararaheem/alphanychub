-- Policy documents the hub assistant answers from (the handbook and Campus
-- know-how). Read by signed-in staff only; edited by admins.
create table if not exists public.hub_docs (
  key text primary key,
  title text not null,
  body text not null,
  source_url text,
  updated_by text,
  updated_at timestamptz not null default now()
);
alter table public.hub_docs enable row level security;
revoke all on public.hub_docs from anon;
grant select, insert, update on public.hub_docs to authenticated;
create policy "hub staff read policy docs" on public.hub_docs for select to authenticated using (public.is_hub_member());
create policy "admins add policy docs" on public.hub_docs for insert to authenticated with check (public.hub_role() = 'admin');
create policy "admins update policy docs" on public.hub_docs for update to authenticated using (public.hub_role() = 'admin') with check (public.hub_role() = 'admin');

-- Loads a policy document from the server side (needs the server's secret key).
create or replace function public.hub_doc_load(p_token text, p_key text, p_title text, p_body text, p_url text, p_by text)
returns text language plpgsql security definer set search_path = public as $$
begin
  if not public.ey_token_ok(p_token) then raise exception 'not allowed'; end if;
  if p_key not in ('handbook', 'campus_notes') then raise exception 'unknown document'; end if;
  insert into public.hub_docs (key, title, body, source_url, updated_by, updated_at)
  values (p_key, p_title, p_body, p_url, p_by, now())
  on conflict (key) do update set title = excluded.title, body = excluded.body, source_url = excluded.source_url, updated_by = excluded.updated_by, updated_at = now();
  return 'ok';
end $$;
revoke execute on function public.hub_doc_load(text, text, text, text, text, text) from public, authenticated;
grant execute on function public.hub_doc_load(text, text, text, text, text, text) to anon;
