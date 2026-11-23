-- HW5: two new columns in the existing public.tasks table.
--
-- priority: how important the task is. The user picks it on the task page and
-- the dashboard shows it. Existing and new tasks start as 'medium'.
alter table public.tasks
  add column priority text not null default 'medium'
  check (priority in ('low', 'medium', 'high'));

-- ai_steps: the checklist OpenAI writes for a task (Edge Function break-down-task).
-- It is a JSON list such as [{"text": "Buy the paint", "done": false}].
alter table public.tasks
  add column ai_steps jsonb not null default '[]'::jsonb
  check (jsonb_typeof(ai_steps) = 'array');

-- The existing policy "Users can CRUD own tasks" also protects these columns:
-- each user can only read and change their own tasks.
