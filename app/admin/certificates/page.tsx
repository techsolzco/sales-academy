import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getEffectiveUser } from '@/lib/auth/get-effective-user'
import { redirect } from 'next/navigation'
import { fetchAllCertificates } from '@/lib/actions/certificates'
import { Breadcrumb } from '@/components/admin/Breadcrumb'
import { Award, ExternalLink } from 'lucide-react'

export const metadata = {
  title: 'Certificates | Admin Portal',
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export default async function AdminCertificatesPage({
  searchParams,
}: {
  searchParams: { user?: string; course?: string }
}) {
  const { profile } = await getEffectiveUser()
  if (profile?.role !== 'admin') redirect('/dashboard')

  const supabase = await createClient()
  const [{ data: users }, { data: courses }] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, full_name')
      .eq('role', 'salesman')
      .order('full_name', { ascending: true }),
    supabase
      .from('courses')
      .select('id, title')
      .is('deleted_at', null)
      .order('title', { ascending: true }),
  ])

  const { data: certificates, error } = await fetchAllCertificates({
    userId: searchParams.user || undefined,
    courseId: searchParams.course || undefined,
  })

  return (
    <div className="px-4 py-5 md:p-8 max-w-6xl animate-fade-in">
      <Breadcrumb crumbs={[
        { label: 'Admin', href: '/admin' },
        { label: 'Certificates' },
      ]} />

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Certificates</h1>
        <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
          Certificates auto-issued when a salesman completes 100% of a course. Each code is publicly verifiable.
        </p>
      </div>

      {/* Filters */}
      <form method="get" className="flex flex-wrap items-end gap-3 mb-6">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Salesman</span>
          <select
            name="user"
            defaultValue={searchParams.user ?? ''}
            className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-800 dark:text-gray-100"
          >
            <option value="">All salesmen</option>
            {(users ?? []).map(u => (
              <option key={u.id} value={u.id}>{u.full_name ?? u.id}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Course</span>
          <select
            name="course"
            defaultValue={searchParams.course ?? ''}
            className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-800 dark:text-gray-100"
          >
            <option value="">All courses</option>
            {(courses ?? []).map(c => (
              <option key={c.id} value={c.id}>{c.title}</option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          className="px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 transition"
        >
          Filter
        </button>
        {(searchParams.user || searchParams.course) && (
          <Link
            href="/admin/certificates"
            className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-600 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
          >
            Clear
          </Link>
        )}
      </form>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          Certificates could not be loaded: {error}
        </div>
      ) : (certificates ?? []).length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-8 text-center">
          <Award className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">No certificates issued yet</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            Certificates appear here automatically once a salesman finishes a course.
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-700/50">
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Holder</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Course</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Code</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Issued</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Verify</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {(certificates ?? []).map(cert => (
                  <tr key={cert.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-medium text-gray-900 dark:text-white text-sm">{cert.holder_name ?? 'Unknown'}</p>
                      {cert.holder_email && (
                        <p className="text-xs text-gray-400 dark:text-gray-500">{cert.holder_email}</p>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
                      {cert.course_title ?? 'Unknown course'}
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-mono text-xs font-semibold text-gray-700 dark:text-gray-300">{cert.code}</span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                      {formatDate(cert.issued_at)}
                    </td>
                    <td className="px-6 py-4">
                      <Link
                        href={`/certificates/${cert.code}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 dark:text-brand-400 hover:underline"
                      >
                        View <ExternalLink className="w-3.5 h-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
