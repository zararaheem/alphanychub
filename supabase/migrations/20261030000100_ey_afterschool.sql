-- Afterschool (Mon–Thu, 3:45–4:45) as a way home: usual afterschool weekdays
-- per child, and 'afterschool' as a one-day change.
alter table public.ey_travel drop constraint ey_travel_mode_check;
alter table public.ey_travel add constraint ey_travel_mode_check check (mode in ('walker', 'bus', 'parent'));
alter table public.ey_travel add column if not exists afterschool_days int[] not null default '{}';
alter table public.ey_travel alter column mode drop not null;
alter table public.ey_travel_day drop constraint ey_travel_day_mode_check;
alter table public.ey_travel_day add constraint ey_travel_day_mode_check check (mode in ('walker', 'bus', 'parent', 'afterschool', 'absent'));
