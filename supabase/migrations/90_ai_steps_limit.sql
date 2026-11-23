-- HW5: limit how often each user can ask OpenAI for task steps, so nobody can
-- run up the OpenAI bill. The count is kept per user and month.
alter table public.usage_tracking
  add column ai_steps_requests integer not null default 0;

-- Counts one AI steps request for the signed-in user. Returns false when the
-- user has already used this month's 30 requests. The Edge Function
-- break-down-task calls it before it calls OpenAI.
create or replace function public.claim_ai_steps_request()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  new_count integer;
begin
  if current_user_id is null then
    raise exception 'Not signed in';
  end if;

  insert into public.usage_tracking (user_id, year_month, tasks_created, ai_steps_requests)
  values (current_user_id, to_char(now(), 'YYYY-MM'), 0, 1)
  on conflict (user_id, year_month)
  do update set ai_steps_requests = usage_tracking.ai_steps_requests + 1
  where usage_tracking.ai_steps_requests < 30
  returning ai_steps_requests into new_count;

  return new_count is not null;
end;
$$;

revoke all on function public.claim_ai_steps_request() from public, anon;
grant execute on function public.claim_ai_steps_request() to authenticated;
