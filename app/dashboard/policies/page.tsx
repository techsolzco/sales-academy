import { fetchPolicies } from '@/lib/actions/policies'
import { FileText } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function PoliciesPage() {
  const policies = await fetchPolicies(true) // published only
  return (
    <div className="px-4 py-5 md:p-8 max-w-3xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Company Policies</h1>
        <p className="text-gray-400 text-sm mt-1">Important rules and guidelines from management.</p>
      </div>
      {policies.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <FileText className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p>No policies published yet.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {policies.map(p => (
            <div key={p.id} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-6">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-3">{p.title}</h2>
              <div className="text-gray-600 dark:text-gray-300 text-sm whitespace-pre-wrap leading-relaxed">{p.content}</div>
              <p className="text-xs text-gray-400 mt-4">Published {new Date(p.updated_at || p.created_at).toLocaleDateString()}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
