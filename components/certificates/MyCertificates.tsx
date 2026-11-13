'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Award, X, Printer, ExternalLink } from 'lucide-react'
import type { Certificate } from '@/lib/actions/certificates'

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export function MyCertificates({ certificates }: { certificates: Certificate[] }) {
  const [selected, setSelected] = useState<Certificate | null>(null)

  if (certificates.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-6 text-center">
        <Award className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">No certificates yet</p>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
          Complete 100% of a course — every lesson and every required review — to earn your first certificate.
        </p>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-3">
        {certificates.map(cert => (
          <div
            key={cert.id}
            className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4 flex flex-col sm:flex-row sm:items-center gap-3"
          >
            <div className="w-10 h-10 rounded-full bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
              <Award className="w-5 h-5 text-amber-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                {cert.course_title ?? 'Course'}
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                Issued {formatDate(cert.issued_at)} · Code {cert.code}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => setSelected(cert)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-600 text-white text-xs font-medium hover:bg-brand-700 transition"
              >
                <Printer className="w-3.5 h-3.5" /> View &amp; Print
              </button>
              <Link
                href={`/certificates/${cert.code}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
              >
                <ExternalLink className="w-3.5 h-3.5" /> Verify
              </Link>
            </div>
          </div>
        ))}
      </div>

      {/* Printable certificate card */}
      {selected && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 print:static print:bg-white print:p-0">
          <style>{`
            @media print {
              body * { visibility: hidden !important; }
              #certificate-print-card, #certificate-print-card * { visibility: visible !important; }
              #certificate-print-card { position: absolute !important; inset: 0 !important; margin: 0 !important; border: none !important; box-shadow: none !important; }
            }
          `}</style>
          <div
            id="certificate-print-card"
            className="bg-white rounded-2xl max-w-2xl w-full p-8 md:p-10 text-center border-4 border-double border-amber-400 relative"
          >
            <button
              onClick={() => setSelected(null)}
              aria-label="Close"
              className="absolute top-4 right-4 p-1.5 rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition print:hidden"
            >
              <X className="w-5 h-5" />
            </button>
            <Award className="w-14 h-14 text-amber-500 mx-auto mb-4" />
            <p className="text-xs font-semibold tracking-[0.3em] text-amber-600 uppercase">Certificate of Completion</p>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mt-4">
              {selected.course_title ?? 'Course'}
            </h2>
            <p className="text-sm text-gray-500 mt-4">
              Issued on {formatDate(selected.issued_at)}
            </p>
            <p className="text-xs text-gray-400 mt-6">
              Certificate code: <span className="font-mono font-semibold text-gray-600">{selected.code}</span>
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Verify at academy.prowala.com/certificates/{selected.code}
            </p>
            <div className="mt-8 flex justify-center gap-3 print:hidden">
              <button
                onClick={() => window.print()}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 transition"
              >
                <Printer className="w-4 h-4" /> Print
              </button>
              <button
                onClick={() => setSelected(null)}
                className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
