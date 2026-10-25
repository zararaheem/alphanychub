-- Run once in the Supabase SQL editor after the migration, with your own
-- school email, to make yourself the first admin. After that, add everyone
-- else from the Access page in the app.
insert into public.allowed_users (email, role, name, added_by)
values (lower('YOUR-EMAIL@alpha.school'), 'admin', 'Your name', 'setup')
on conflict (email) do update set role = 'admin';
