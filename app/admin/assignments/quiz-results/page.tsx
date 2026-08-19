import { fetchPendingQuizAttempts, fetchReviewedQuizAttempts } from '@/lib/actions/quiz-approval'
import QuizResultActions from './QuizResultActions'

export const metadata = {
  title: 'Quiz Approvals | Admin',
}

export default async function QuizResultsPage() {
  const pending = await fetchPendingQuizAttempts()
  const reviewed = await fetchReviewedQuizAttempts()

  return (
    <div className="max-w-6xl mx-auto space-y-8 p-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Pending Quiz Approvals</h1>
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Student Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quiz Title</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Score</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Submitted At</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {pending.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-gray-500">No pending quiz attempts.</td>
                </tr>
              ) : (
                pending.map((attempt: any) => (
                  <tr key={attempt.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{attempt.profile?.full_name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{attempt.quiz?.title}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{attempt.score}%</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(attempt.submitted_at).toLocaleString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <QuizResultActions attemptId={attempt.id} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-4">Reviewed Quiz Attempts</h2>
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Student Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quiz Title</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Score</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Submitted At</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {reviewed.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-gray-500">No reviewed quiz attempts.</td>
                </tr>
              ) : (
                reviewed.map((attempt: any) => (
                  <tr key={attempt.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{attempt.profile?.full_name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{attempt.quiz?.title}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{attempt.score}%</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${attempt.approval_status === 'approved' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {attempt.approval_status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(attempt.submitted_at).toLocaleString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
