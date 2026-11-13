import Link from 'next/link'
import { Award, BadgeCheck, XCircle } from 'lucide-react'
import { fetchCertificateByCode } from '@/lib/actions/certificates'
import { PrintButton } from '@/components/certificates/PrintButton'

export const metadata = {
  title: 'Verify Certificate | Sheraz Academy',
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

// Public verification page — no auth. Shows only the holder name, course
// title and issued date for a valid code (see fetchCertificateByCode).
export default async function VerifyCertificatePage({
  params,
}: {
  params: { code: string }
}) {
  const { data: cert } = await fetchCertificateByCode(params.code)

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center px-4 py-10">
      <div className="max-w-xl w-full">
        {cert ? (
          <div className="bg-white dark:bg-gray-800 rounded-2xl border-4 border-double border-amber-400 shadow-sm p-8 md:p-10 text-center">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-xs font-semibold">
              <BadgeCheck className="w-4 h-4" /> VALID CERTIFICATE
            </span>
            <Award className="w-14 h-14 text-amber-500 mx-auto mt-6 mb-4" />
            <p className="text-xs font-semibold tracking-[0.3em] text-amber-600 uppercase">
              Certificate of Completion
            </p>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mt-4">
              {cert.holder_name}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              has successfully completed
            </p>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mt-1">
              {cert.course_title}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">
              Issued on {formatDate(cert.issued_at)}
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-6">
              Certificate code: <span className="font-mono font-semibold text-gray-600 dark:text-gray-300">{params.code.toUpperCase()}</span>
            </p>
            <div className="mt-8 flex justify-center gap-3">
              <PrintButton />
              <Link
                href="/dashboard"
                className="inline-flex items-center px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-600 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition print:hidden"
              >
                Back to Academy
              </Link>
            </div>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-8 md:p-10 text-center">
            <XCircle className="w-14 h-14 text-red-400 mx-auto mb-4" />
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 text-xs font-semibold">
              NOT FOUND
            </span>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white mt-4">
              No certificate found for this code
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              Code <span className="font-mono font-semibold text-gray-600 dark:text-gray-300">{params.code.toUpperCase()}</span> does
              not match any issued certificate. Check the code and try again.
            </p>
            <Link
              href="/dashboard"
              className="inline-flex items-center mt-8 px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 transition"
            >
              Back to Academy
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
