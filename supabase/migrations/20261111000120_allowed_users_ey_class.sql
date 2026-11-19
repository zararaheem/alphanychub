-- Which Early Years class a guide teaches (PK or K); null = both.
-- (Who teaches which class is set in the tracker's Admin tab, not here.)
alter table public.allowed_users add column if not exists ey_class text check (ey_class in ('PK', 'K'));
