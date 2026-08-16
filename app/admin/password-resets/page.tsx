import { fetchPasswordResetRequests } from '@/lib/actions/password-reset'
import { PasswordResetManager } from '@/components/admin/PasswordResetManager'
import { Breadcrumb } from '@/components/admin/Breadcrumb'

export const dynamic = 'force-dynamic'

export default async function PasswordResetsPage() {
  const requests = await fetchPasswordResetRequests()
  return (
    <div className="p-8 max-w-4xl">
      <Breadcrumb crumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Password Resets' }]} />
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Password Reset Requests</h1>
        <p className="text-sm text-gray-400 mt-1">Approve or reject user password reset requests.</p>
      </div>
      <PasswordResetManager initialRequests={requests} />
    </div>
  )
}
