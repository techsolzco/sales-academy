import { SignOutButton } from '@/components/auth/SignOutButton'
import { Clock, ShieldX } from 'lucide-react'

interface Props {
  searchParams: Promise<{ status?: string }>
}

export default async function PendingPage({ searchParams }: Props) {
  const { status } = await searchParams
  const isBlocked = status === 'inactive' || status === 'suspended'

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800 p-8 text-center">

        {isBlocked ? (
          <>
            {/* Blocked state */}
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
              <ShieldX className="w-8 h-8 text-red-600 dark:text-red-400" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Access Blocked
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mb-2">
              Your account access has been blocked by the administrator.
            </p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mb-8">
              Please contact your admin for more details or to request reactivation.
            </p>
          </>
        ) : (
          <>
            {/* Pending approval state */}
            <div className="w-16 h-16 bg-brand-100 dark:bg-brand-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
              <Clock className="w-8 h-8 text-brand-600 dark:text-brand-400 animate-pulse" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Application Under Review
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mb-8">
              Our team will review your application within 24 hours. You will receive an email notification once your account is approved.
            </p>
          </>
        )}

        <div className="flex justify-center">
          <SignOutButton />
        </div>
      </div>
    </div>
  )
}

