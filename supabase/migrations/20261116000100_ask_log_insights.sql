-- Ask the hub insights: topic, who answers send people to, and staff feedback.
alter table public.ask_log add column if not exists topic text;
alter table public.ask_log add column if not exists check_with text[];
alter table public.ask_log add column if not exists feedback text;
create index if not exists ask_log_created on public.ask_log (created_at desc);
