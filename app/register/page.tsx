import { EnrollmentForm } from '@/components/auth/EnrollmentForm'
import { LanguageProvider } from '@/lib/i18n/LanguageContext'

export default function RegisterPage() {
  return (
    <LanguageProvider>
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="max-w-xl w-full">
          <EnrollmentForm />
        </div>
      </div>
    </LanguageProvider>
  )
}
