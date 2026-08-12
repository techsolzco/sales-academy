import { EnrollmentForm } from '@/components/auth/EnrollmentForm'

export default function RegisterPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="max-w-xl w-full">
        <EnrollmentForm />
      </div>
    </div>
  )
}
