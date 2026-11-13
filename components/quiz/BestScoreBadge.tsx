import { fetchBestScore } from '@/lib/actions/quiz-scores'

// Staff-facing best-score badge for quiz cards. Server component: it calls
// fetchBestScore for the signed-in user and renders nothing when there is
// no attempt yet (or the fetch fails). Wiring: drop it into a quiz card on
// a staff list page — see the wiring snippet in the task report; do NOT
// wire it into app/dashboard/quiz/[id]/page.tsx (hold file).
export async function BestScoreBadge({ quizId }: { quizId: string }) {
  const res = await fetchBestScore(quizId)
  if (res.error || !res.data) return null

  const best = res.data
  const score = Number(best.score)
  const maxScore = Number(best.max_score)
  const percentage = Math.round(Number(best.percentage))

  return (
    <span
      className={
        best.passed
          ? 'inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-2.5 py-1 rounded-full'
          : 'inline-flex items-center gap-1 text-xs font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 px-2.5 py-1 rounded-full'
      }
      title={`Best attempt · ${best.passed ? 'Passed' : 'Not passed yet'}`}
    >
      Best: {score}/{maxScore} ({percentage}%)
    </span>
  )
}
