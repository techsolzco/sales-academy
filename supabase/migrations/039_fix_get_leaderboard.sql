-- ============================================================
--  Migration 039: Rewrite get_leaderboard() — full-course completion
--  Fixes: audit B10 (supabase/migrations/006_phase6.sql:19-30).
--
--  PROBLEM: course_counts counted a course as completed after ANY
--  single completed lesson (COUNT(DISTINCT m.course_id) where any
--  lesson is complete). One lesson in each of N courses = N x 300
--  points. The join also had no deleted_at filter, so soft-deleted
--  lessons/courses counted.
--
--  FIX: a course counts for a user ONLY when EVERY countable
--  lesson of that course is complete for that user, where
--  "countable" = lesson deleted_at IS NULL, lesson status =
--  'published', its module deleted_at IS NULL, and the course
--  itself deleted_at IS NULL and status = 'published'.
--  Courses with zero countable lessons never count (avoids 0 = 0).
--
--  SCHEMA NOTES (verified from the migrations):
--  - lessons.status exists (002_phase2_schema.sql step 6);
--    courses.is_published was DROPPED in 002, so status =
--    'published' is used for courses too.
--  - deleted_at on courses/modules/lessons exists
--    (019_soft_delete.sql).
--  - lesson_progress has UNIQUE(user_id, lesson_id), so
--    COUNT(DISTINCT lesson_id) is exact.
--
--  KEPT UNCHANGED (so lib/actions/leaderboard.ts keeps working):
--  function name get_leaderboard, returned columns
--  (user_id, full_name, avatar_url, courses_completed,
--  lessons_completed, scripts_copied, score), scoring weights
--  (300 / 10 / 50), role filter ('salesman', 'student'),
--  ORDER BY score DESC, LANGUAGE sql STABLE, NO SECURITY DEFINER
--  (audit S22: runs with invoker rights, RLS applies),
--  GRANT EXECUTE TO authenticated.
--
--  JUDGEMENT CALL (flagged): lesson_counts now also excludes
--  soft-deleted lessons from lessons_completed. The original
--  counted them; counting a deleted lesson as "completed" inflates
--  the score, so the deleted filter is applied there too.
-- ============================================================

create or replace function public.get_leaderboard()
returns table (
  user_id uuid,
  full_name text,
  avatar_url text,
  courses_completed bigint,
  lessons_completed bigint,
  scripts_copied bigint,
  score bigint
) language sql stable as $$
  with
  lesson_counts as (
    select lp.user_id,
      count(*) filter (where lp.completed = true) as lessons_done
    from public.lesson_progress lp
    join public.lessons l on l.id = lp.lesson_id
    where l.deleted_at is null
    group by lp.user_id
  ),
  -- Countable lessons per course: published, non-deleted lessons
  -- in non-deleted modules of published, non-deleted courses.
  course_totals as (
    select m.course_id, count(*) as total_lessons
    from public.lessons l
    join public.modules m on m.id = l.module_id
    join public.courses c on c.id = m.course_id
    where l.deleted_at is null
      and l.status = 'published'
      and m.deleted_at is null
      and c.deleted_at is null
      and c.status = 'published'
    group by m.course_id
  ),
  -- (user, course) pairs where the user completed ALL countable
  -- lessons of the course.
  course_done as (
    select lp.user_id, m.course_id
    from public.lesson_progress lp
    join public.lessons l on l.id = lp.lesson_id
    join public.modules m on m.id = l.module_id
    join course_totals ct on ct.course_id = m.course_id
    where lp.completed = true
      and l.deleted_at is null
      and l.status = 'published'
      and m.deleted_at is null
    group by lp.user_id, m.course_id, ct.total_lessons
    having count(distinct lp.lesson_id) = ct.total_lessons
  ),
  course_counts as (
    select user_id, count(*) as courses_done
    from course_done
    group by user_id
  ),
  script_counts as (
    select user_id, count(*) as scripts_done
    from public.script_copies
    group by user_id
  )
  select
    p.id as user_id,
    p.full_name,
    p.avatar_url,
    coalesce(cc.courses_done, 0) as courses_completed,
    coalesce(lc.lessons_done, 0) as lessons_completed,
    coalesce(sc.scripts_done, 0) as scripts_copied,
    (
      coalesce(cc.courses_done, 0) * 300 +
      coalesce(lc.lessons_done, 0) * 10 +
      coalesce(sc.scripts_done, 0) * 50
    ) as score
  from public.profiles p
  left join lesson_counts lc on lc.user_id = p.id
  left join course_counts cc on cc.user_id = p.id
  left join script_counts sc on sc.user_id = p.id
  where p.role in ('salesman', 'student')
  order by score desc;
$$;

grant execute on function public.get_leaderboard() to authenticated;
