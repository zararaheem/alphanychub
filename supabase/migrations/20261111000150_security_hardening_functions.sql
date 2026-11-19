-- Security review: signed-out visitors may call only the functions built for
-- them (a family opening a report link, and the token-checked Slack ones the
-- server calls). Everything else needs a signed-in user.
revoke execute on function public.can_use_tracker() from public, anon;
revoke execute on function public.ey_create_share(bigint, date, text, text) from public, anon;
revoke execute on function public.hub_role() from public, anon;
revoke execute on function public.is_hub_admin() from public, anon;
revoke execute on function public.can_see_parents() from public, anon;
revoke execute on function public.my_children() from public, anon;
-- The token check is only ever used inside other functions.
revoke execute on function public.ey_token_ok(text) from public, anon, authenticated;
-- The token-checked functions are only called by the server, never by a signed-in browser.
revoke execute on function public.ey_roster(text, date) from authenticated;
revoke execute on function public.ey_roster2(text, date) from authenticated;
revoke execute on function public.ey_slack_roster(text, date) from authenticated;
revoke execute on function public.ey_slack_set(text, bigint[], text, date, text, text, int[], text) from authenticated;
revoke execute on function public.ey_set_walker_days(text, bigint[], int[], text) from authenticated;
revoke execute on function public.ey_slack_observe(text, bigint[], bigint, text, text, text) from authenticated;
revoke execute on function public.ey_slack_works(text) from authenticated;
-- Pin search_path on the older role helpers.
alter function public.is_hub_member() set search_path = public;
alter function public.current_email() set search_path = public;
alter function public.can_edit_hub() set search_path = public;
alter function public.can_manage_staff() set search_path = public;
