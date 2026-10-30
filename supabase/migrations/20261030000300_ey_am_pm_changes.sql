-- Morning and dismissal changes are separate: a parent drop-off today doesn't
-- change how the child goes home. Absent is written to both. New one-day
-- choices: 'late' (morning) and 'early' (early pickup at dismissal).
-- Applied as migration ey_am_pm_changes; see that migration for the updated
-- ey_slack_roster (adds today_am) and ey_slack_set (adds p_part) functions.
alter table public.ey_travel_day add column if not exists part text not null default 'pm';
alter table public.ey_travel_day add constraint ey_travel_day_part_check check (part in ('am', 'pm'));
alter table public.ey_travel_day drop constraint ey_travel_day_pkey;
alter table public.ey_travel_day add primary key (student_id, day, part);
alter table public.ey_travel_day drop constraint ey_travel_day_mode_check;
alter table public.ey_travel_day add constraint ey_travel_day_mode_check check (
  (part = 'am' and mode in ('walker', 'bus', 'parent', 'late', 'absent'))
  or (part = 'pm' and mode in ('walker', 'bus', 'parent', 'afterschool', 'early', 'absent')));
