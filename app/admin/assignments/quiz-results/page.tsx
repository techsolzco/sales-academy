import { fetchPendingQuizAttempts, fetchReviewedQuizAttempts } from '@/lib/actions/quiz-approval'
import QuizResultActions from './QuizResultActions'

export const metadata = {
  title: 'Quiz Approvals | Admin',
}

export default async function QuizResultsPage() {
  const pending = await fetchPendingQuizAttempts()
  const reviewed = await fetchReviewedQuizAttempts()

  return (
    <div className="max-w-6xl mx-auto space-y-8 px-4 py-5 md:p-8">
      {/* Pending */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">Pending Quiz Approvals</h1>

        {/* Desktop table */}
        <div className="hidden md:block bg-white dark:bg-gray-800 rounded-xl shadow overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                {['Student Name', 'Quiz Title', 'Score', 'Submitted At', 'Actions'].map(h => (
                  <th key={h} className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {pending.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-4 text-center text-gray-500">No pending quiz attempts.</td></tr>
              ) : pending.map((attempt: any) => (
                <tr key={attempt.id}>
                  <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100 break-words">{attempt.profile?.full_name}</td>
                  <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100 break-words">{attempt.quiz?.title}</td>
                  <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">{attempt.score}%</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{new Date(attempt.submitted_at).toLocaleString()}</td>
                  <td className="px-6 py-4 text-sm font-medium"><QuizResultActions attemptId={attempt.id} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="md:hidden space-y-3">
          {pending.length === 0 ? (
            <p className="text-center text-gray-500 py-8 text-sm">No pending quiz attempts.</p>
          ) : pending.map((attempt: any) => (
            <div key={attempt.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4 space-y-3">
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase">Student</p>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 break-words">{attempt.profile?.full_name}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase">Quiz</p>
                <p className="text-sm text-gray-700 dark:text-gray-300 break-words">{attempt.quiz?.title}</p>
              </div>
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase">Score</p>
                  <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{attempt.score}%</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-semibold text-gray-400 uppercase">Submitted</p>
                  <p className="text-xs text-gray-500">{new Date(attempt.submitted_at).toLocaleDateString()}</p>
                </div>
              </div>
              <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
                <QuizResultActions attemptId={attempt.id} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Reviewed */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">Reviewed Quiz Attempts</h2>

        {/* Desktop table */}
        <div className="hidden md:block bg-white dark:bg-gray-800 rounded-xl shadow overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                {['Student Name', 'Quiz Title', 'Score', 'Status', 'Submitted At'].map(h => (
                  <th key={h} className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {reviewed.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-4 text-center text-gray-500">No reviewed quiz attempts.</td></tr>
              ) : reviewed.map((attempt: any) => (
                <tr key={attempt.id}>
                  <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100 break-words">{attempt.profile?.full_name}</td>
                  <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100 break-words">{attempt.quiz?.title}</td>
                  <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">{attempt.score}%</td>
                  <td className="px-6 py-4 text-sm">
                    <span className={`px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${attempt.approval_status === 'approved' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {attempt.approval_status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">{new Date(attempt.submitted_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="md:hidden space-y-3">
          {reviewed.length === 0 ? (
            <p className="text-center text-gray-500 py-8 text-sm">No reviewed quiz attempts.</p>
          ) : reviewed.map((attempt: any) => (
            <div key={attempt.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4 space-y-3">
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase">Student</p>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 break-words">{attempt.profile?.full_name}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase">Quiz</p>
                <p className="text-sm text-gray-700 dark:text-gray-300 break-words">{attempt.quiz?.title}</p>
              </div>
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase">Score</p>
                  <p className="text-sm font-bold">{attempt.score}%</p>
                </div>
                <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${attempt.approval_status === 'approved' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                  {attempt.approval_status}
                </span>
                <div className="text-right">
                  <p className="text-xs font-semibold text-gray-400 uppercase">Submitted</p>
                  <p className="text-xs text-gray-500">{new Date(attempt.submitted_at).toLocaleDateString()}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
