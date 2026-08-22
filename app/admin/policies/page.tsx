import { fetchPolicies } from '@/lib/actions/policies'
import { PolicyManager } from '@/components/admin/PolicyManager'
import { Breadcrumb } from '@/components/admin/Breadcrumb'

export const dynamic = 'force-dynamic'

export default async function AdminPoliciesPage() {
  const policies = await fetchPolicies()
  return (
    <div className="px-4 py-5 md:p-8 max-w-4xl">
      <Breadcrumb crumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Company Policies' }]} />
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Company Policies</h1>
        <p className="text-sm text-gray-400 mt-1">Create and publish policy documents for all salesmen.</p>
      </div>
      <PolicyManager initialPolicies={policies} />
    </div>
  )
}
