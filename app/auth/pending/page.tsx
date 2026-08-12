import { SignOutButton } from '@/components/auth/SignOutButton'
import { Clock } from 'lucide-react'

export default function PendingPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
        <div className="w-16 h-16 bg-brand-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <Clock className="w-8 h-8 text-brand-600 animate-pulse" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Application Under Review</h1>
        <p className="text-gray-500 mb-8">
          Our team will review your application within 24 hours. You will receive an email notification once your account is approved.
        </p>
        <div className="flex justify-center">
          <SignOutButton />
        </div>
      </div>
    </div>
  )
}
