-- Idempotent write keys for offline sync.
-- Run in the Supabase SQL editor before deploying the offline-logging code.
-- Safe to re-run: it first removes any pre-existing duplicate rows (keeping the
-- most recent one per group), then creates the unique indexes.

-- 1a. De-duplicate workout_sets: keep one row per (session, exercise, set).
--     ctid is the physical row location; the largest ctid ≈ the newest row.
delete from public.workout_sets a
using public.workout_sets b
where a.workout_session_id = b.workout_session_id
  and a.exercise_id = b.exercise_id
  and a.set_number = b.set_number
  and a.ctid < b.ctid;

-- 1b. Unique key so offline set writes replay as idempotent upserts.
create unique index if not exists workout_sets_session_exercise_set_idx
  on public.workout_sets (workout_session_id, exercise_id, set_number);

-- 2a. De-duplicate nutrition_logs: keep one row per (user, day).
delete from public.nutrition_logs a
using public.nutrition_logs b
where a.user_id = b.user_id
  and a.date = b.date
  and a.ctid < b.ctid;

-- 2b. One nutrition row per user per day, so offline nutrition upserts replay
--     idempotently instead of inserting duplicates.
create unique index if not exists nutrition_logs_user_date_idx
  on public.nutrition_logs (user_id, date);

-- 3. Verify (both should return zero remaining duplicates)
select 'workout_sets' as tbl, count(*) as dupe_groups from (
  select 1 from public.workout_sets
  group by workout_session_id, exercise_id, set_number having count(*) > 1
) s
union all
select 'nutrition_logs', count(*) from (
  select 1 from public.nutrition_logs group by user_id, date having count(*) > 1
) n;
