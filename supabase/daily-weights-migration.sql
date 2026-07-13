-- Daily weight tracking: replaces the weekly check-in with a per-day weight log.
-- Run this in the Supabase SQL editor BEFORE deploying the matching code.
--
-- Safe & reversible: creates a NEW table and copies weekly data into it.
-- The old weekly_checkins table is left untouched as a backup — drop it
-- later (see the bottom of this file) once you're happy with daily tracking.

-- ============================================================
-- 1. New table: one weight entry per user per day
-- ============================================================
create table if not exists public.daily_weights (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  date       date not null,
  weight     numeric not null,
  created_at timestamptz not null default now(),
  unique (user_id, date)
);

-- ============================================================
-- 2. Row Level Security — owner-only, same model as every other table
-- ============================================================
alter table public.daily_weights enable row level security;

drop policy if exists "own daily weights" on public.daily_weights;
create policy "own daily weights" on public.daily_weights
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ============================================================
-- 3. Migrate existing weekly check-ins → daily entries
--    (each week's start date becomes that entry's date; weight only)
--    Idempotent: safe to re-run, existing days are kept.
-- ============================================================
insert into public.daily_weights (user_id, date, weight)
select user_id, week_start_date, weight
from public.weekly_checkins
where weight is not null
on conflict (user_id, date) do nothing;

-- ============================================================
-- 4. Verify
-- ============================================================
select count(*) as migrated_rows from public.daily_weights;

-- ============================================================
-- 5. LATER (optional cleanup, only after you're confident):
--    drop table public.weekly_checkins;
-- ============================================================
