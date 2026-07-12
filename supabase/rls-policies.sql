-- Row Level Security policies for the fitness app.
-- Run this in the Supabase SQL editor (Dashboard → SQL Editor → New query).
-- Safe to re-run: policies are dropped and recreated.
--
-- Ownership model:
--   user_settings.id            = auth.uid()  (one row per user)
--   weekly_checkins.user_id     = auth.uid()
--   nutrition_logs.user_id      = auth.uid()
--   cardio_sessions.user_id     = auth.uid()
--   workout_templates.user_id   = auth.uid()
--   workout_sessions.user_id    = auth.uid()
--   exercises        → owned via workout_templates(template_id)
--   workout_sets     → owned via workout_sessions(workout_session_id)

-- ============================================================
-- 1. Enable RLS on every table
-- ============================================================
alter table public.user_settings     enable row level security;
alter table public.weekly_checkins   enable row level security;
alter table public.nutrition_logs    enable row level security;
alter table public.cardio_sessions   enable row level security;
alter table public.workout_templates enable row level security;
alter table public.workout_sessions  enable row level security;
alter table public.exercises         enable row level security;
alter table public.workout_sets      enable row level security;

-- ============================================================
-- 2. user_settings (primary key IS the user id)
-- ============================================================
drop policy if exists "own settings" on public.user_settings;
create policy "own settings" on public.user_settings
  for all
  using (id = auth.uid())
  with check (id = auth.uid());

-- ============================================================
-- 3. Tables with a direct user_id column
-- ============================================================
drop policy if exists "own checkins" on public.weekly_checkins;
create policy "own checkins" on public.weekly_checkins
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "own nutrition" on public.nutrition_logs;
create policy "own nutrition" on public.nutrition_logs
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "own cardio" on public.cardio_sessions;
create policy "own cardio" on public.cardio_sessions
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "own templates" on public.workout_templates;
create policy "own templates" on public.workout_templates
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "own sessions" on public.workout_sessions;
create policy "own sessions" on public.workout_sessions
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ============================================================
-- 4. Child tables owned through their parent
-- ============================================================
drop policy if exists "own exercises" on public.exercises;
create policy "own exercises" on public.exercises
  for all
  using (
    exists (
      select 1 from public.workout_templates t
      where t.id = exercises.template_id
        and t.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.workout_templates t
      where t.id = exercises.template_id
        and t.user_id = auth.uid()
    )
  );

drop policy if exists "own sets" on public.workout_sets;
create policy "own sets" on public.workout_sets
  for all
  using (
    exists (
      select 1 from public.workout_sessions s
      where s.id = workout_sets.workout_session_id
        and s.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.workout_sessions s
      where s.id = workout_sets.workout_session_id
        and s.user_id = auth.uid()
    )
  );

-- ============================================================
-- 5. Schema addition: weight unit preference (kg/lbs setting)
-- ============================================================
alter table public.user_settings
  add column if not exists weight_unit text not null default 'lbs'
  check (weight_unit in ('lbs', 'kg'));

-- ============================================================
-- 6. Verify — every row should show rowsecurity = true and
--    at least one policy per table
-- ============================================================
select tablename, rowsecurity
from pg_tables
where schemaname = 'public'
order by tablename;

select tablename, policyname, cmd
from pg_policies
where schemaname = 'public'
order by tablename, policyname;
