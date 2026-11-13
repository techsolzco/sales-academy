'use client'

import { useMemo, useRef, useState } from 'react'
import { Upload, X, Loader2, Users, Copy, Check, Download, AlertTriangle, FileText } from 'lucide-react'
import { bulkCreateUsers, type BulkCreateUsersResult, type BulkUserRow } from '@/lib/actions/users'
import { useRouter } from 'next/navigation'

// ─── Bulk user import (CSV) — audit §3 #4 ───────────────────────────────────
// Expected columns (header row): full_name,email,phone
//   - full_name: required
//   - email: required, must be a valid email address
//   - phone: optional
// A file without a header row is also accepted and read as
// full_name,email,phone in that order. Fields may be quoted ("...") with
// commas inside quotes and "" for a literal quote — parsed client-side
// with a small hand-rolled parser (no new dependencies).
// Every created user gets their own generated temporary password, shown
// once in the results so the admin can share it via WhatsApp.

const SAMPLE_CSV = 'full_name,email,phone\nAhmed Khan,ahmed@example.com,+92 300 1234567\nSara Ali,sara@example.com,\n'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Minimal CSV parser: handles quoted fields, commas inside quotes, "" escapes, CRLF. */
function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false
  const pushField = () => { row.push(field); field = '' }
  const pushRow = () => { pushField(); rows.push(row); row = [] }

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++ } else { inQuotes = false }
      } else {
        field += ch
      }
    } else if (ch === '"') {
      inQuotes = true
    } else if (ch === ',') {
      pushField()
    } else if (ch === '\n') {
      pushRow()
    } else if (ch === '\r') {
      // Ignore CR (CRLF handled by the following \n)
    } else {
      field += ch
    }
  }
  // Last line without trailing newline
  if (field !== '' || row.length > 0) pushRow()
  // Drop fully-empty rows (e.g. trailing blank lines)
  return rows.filter((r) => r.some((c) => c.trim() !== ''))
}

interface PreviewRow extends BulkUserRow {
  row: number
  issues: string[]
}

function toPreviewRows(text: string): PreviewRow[] {
  const raw = parseCsv(text)
  if (raw.length === 0) return []

  // Header detection: first row contains an "email" cell.
  const first = raw[0].map((c) => c.trim().toLowerCase())
  let nameIdx = 0
  let emailIdx = 1
  let phoneIdx = 2
  let dataRows = raw
  if (first.includes('email')) {
    emailIdx = first.indexOf('email')
    nameIdx = first.findIndex((c) => c === 'full_name' || c === 'full name' || c === 'name')
    if (nameIdx === -1) nameIdx = 0
    phoneIdx = first.findIndex((c) => c === 'phone' || c === 'phone_number' || c === 'mobile')
    if (phoneIdx === -1) phoneIdx = 2
    dataRows = raw.slice(1)
  }

  const seen = new Set<string>()
  return dataRows.map((cells, i) => {
    const full_name = (cells[nameIdx] ?? '').trim()
    const email = (cells[emailIdx] ?? '').trim()
    const phone = (cells[phoneIdx] ?? '').trim()
    const issues: string[] = []
    if (!full_name) issues.push('Name is empty')
    if (!email || !EMAIL_RE.test(email)) issues.push('Invalid email')
    const key = email.toLowerCase()
    if (email && seen.has(key)) issues.push('Duplicate email in file')
    if (email) seen.add(key)
    return { row: i + 1, full_name, email, phone: phone || undefined, issues }
  })
}

export function BulkUserImport() {
  const [isOpen, setIsOpen] = useState(false)
  const [csvText, setCsvText] = useState('')
  const [fileName, setFileName] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<BulkCreateUsersResult | null>(null)
  const [copied, setCopied] = useState<string | null>(null)
  const [copiedAll, setCopiedAll] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  const previewRows = useMemo(() => toPreviewRows(csvText), [csvText])
  const validCount = previewRows.filter((r) => r.issues.length === 0).length

  const closeModal = () => {
    setIsOpen(false)
    setCsvText('')
    setFileName(null)
    setError(null)
    setResult(null)
    setCopied(null)
    setCopiedAll(false)
  }

  const handleFile = (file: File) => {
    const reader = new FileReader()
    reader.onload = () => {
      setCsvText(String(reader.result ?? ''))
      setFileName(file.name)
      setResult(null)
      setError(null)
    }
    reader.readAsText(file)
  }

  const downloadSample = () => {
    const blob = new Blob([SAMPLE_CSV], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'bulk-users-sample.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleImport = async () => {
    if (previewRows.length === 0) return
    setError(null)
    setIsSubmitting(true)
    const rows: BulkUserRow[] = previewRows.map((r) => ({
      full_name: r.full_name,
      email: r.email,
      phone: r.phone,
    }))
    const res = await bulkCreateUsers(rows)
    setIsSubmitting(false)
    if (res.error) {
      setError(res.error)
    } else if (res.data) {
      setResult(res.data)
      router.refresh()
    }
  }

  const copyPassword = async (email: string, password: string) => {
    await navigator.clipboard.writeText(password)
    setCopied(email)
  }

  const copyAll = async () => {
    if (!result) return
    const lines = result.created.map((c) => `${c.full_name} <${c.email}> — temp password: ${c.tempPassword}`)
    await navigator.clipboard.writeText(lines.join('\n'))
    setCopiedAll(true)
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700 px-4 py-2.5 rounded-xl font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition"
      >
        <Upload className="w-4 h-4" />
        <span className="hidden sm:inline">Bulk Import</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-gray-800 rounded-t-2xl sm:rounded-2xl w-full sm:max-w-2xl shadow-xl overflow-hidden max-h-[92vh] overflow-y-auto">
            <div className="p-5 sm:p-6 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Bulk Import Users</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Create many salesman accounts at once from a CSV file</p>
              </div>
              <button onClick={closeModal} className="text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 p-2 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            {result ? (
              <div className="p-6 space-y-5">
                <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl">
                  <p className="text-sm font-medium text-green-800 dark:text-green-300">
                    Import finished — {result.created.length} created, {result.failed.length} failed
                  </p>
                  <p className="text-sm text-green-700 dark:text-green-400 mt-1">Share each temporary password with the new user (e.g. via WhatsApp) — it is shown only once.</p>
                </div>

                {result.created.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Created ({result.created.length})</h3>
                      <button type="button" onClick={copyAll} className="text-xs font-medium text-brand-600 hover:text-brand-700 flex items-center gap-1">
                        {copiedAll ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        {copiedAll ? 'Copied all' : 'Copy all'}
                      </button>
                    </div>
                    <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 dark:bg-gray-900 text-left">
                          <tr>
                            <th className="px-3 py-2 font-medium text-gray-500">Name</th>
                            <th className="px-3 py-2 font-medium text-gray-500">Email</th>
                            <th className="px-3 py-2 font-medium text-gray-500">Temp password</th>
                            <th className="px-3 py-2" />
                          </tr>
                        </thead>
                        <tbody>
                          {result.created.map((c) => (
                            <tr key={c.email} className="border-t border-gray-100 dark:border-gray-700">
                              <td className="px-3 py-2 text-gray-900 dark:text-gray-100">{c.full_name}</td>
                              <td className="px-3 py-2 text-gray-600 dark:text-gray-300 break-all">{c.email}</td>
                              <td className="px-3 py-2 font-mono text-xs text-gray-900 dark:text-gray-100">{c.tempPassword}</td>
                              <td className="px-3 py-2 text-right">
                                <button type="button" onClick={() => copyPassword(c.email, c.tempPassword)} className="px-2.5 py-1 bg-brand-600 text-white text-xs font-medium rounded-lg hover:bg-brand-700 transition">
                                  {copied === c.email ? 'Copied' : 'Copy'}
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {result.failed.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">Failed ({result.failed.length})</h3>
                    <div className="border border-red-200 dark:border-red-800 rounded-xl overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-red-50 dark:bg-red-900/20 text-left">
                          <tr>
                            <th className="px-3 py-2 font-medium text-red-600 dark:text-red-400">Row</th>
                            <th className="px-3 py-2 font-medium text-red-600 dark:text-red-400">Email</th>
                            <th className="px-3 py-2 font-medium text-red-600 dark:text-red-400">Reason</th>
                          </tr>
                        </thead>
                        <tbody>
                          {result.failed.map((f) => (
                            <tr key={`${f.row}-${f.email}`} className="border-t border-red-100 dark:border-red-900/40">
                              <td className="px-3 py-2 text-gray-900 dark:text-gray-100">{f.row}</td>
                              <td className="px-3 py-2 text-gray-600 dark:text-gray-300 break-all">{f.email || '—'}</td>
                              <td className="px-3 py-2 text-gray-600 dark:text-gray-300">{f.reason}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                <div className="pt-2 flex justify-end gap-3">
                  <button type="button" onClick={closeModal} className="px-5 py-2.5 bg-brand-600 text-white font-medium rounded-xl hover:bg-brand-700 transition">Done</button>
                </div>
              </div>
            ) : (
              <div className="p-6 space-y-4">
                {error && (
                  <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm border border-red-100">{error}</div>
                )}

                <div className="text-sm text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-3">
                  <p className="font-medium text-gray-900 dark:text-gray-100 flex items-center gap-1.5"><FileText className="w-4 h-4" /> Expected format</p>
                  <p className="mt-1 font-mono text-xs">full_name,email,phone</p>
                  <p className="mt-1">Header row required for files; pasted text may omit it (read as full_name, email, phone). Phone is optional. Each user gets their own generated temporary password.</p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,text/csv"
                    className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = '' }}
                  />
                  <button type="button" onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 px-4 py-2.5 bg-brand-600 text-white text-sm font-medium rounded-xl hover:bg-brand-700 transition">
                    <Upload className="w-4 h-4" /> Choose CSV file
                  </button>
                  <button type="button" onClick={downloadSample} className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 dark:border-gray-700 text-sm font-medium rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                    <Download className="w-4 h-4" /> Sample CSV
                  </button>
                  {fileName && <span className="self-center text-sm text-gray-500 dark:text-gray-400">{fileName}</span>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Or paste CSV text</label>
                  <textarea
                    value={csvText}
                    onChange={(e) => { setCsvText(e.target.value); setFileName(null); setResult(null); setError(null) }}
                    rows={6}
                    placeholder={'full_name,email,phone\nAhmed Khan,ahmed@example.com,+92 300 1234567'}
                    className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 font-mono text-sm outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                  />
                </div>

                {previewRows.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-1.5">
                      <Users className="w-4 h-4" /> Preview — {previewRows.length} rows ({validCount} valid, {previewRows.length - validCount} with issues)
                    </p>
                    <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden max-h-64 overflow-y-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 dark:bg-gray-900 text-left sticky top-0">
                          <tr>
                            <th className="px-3 py-2 font-medium text-gray-500">#</th>
                            <th className="px-3 py-2 font-medium text-gray-500">Name</th>
                            <th className="px-3 py-2 font-medium text-gray-500">Email</th>
                            <th className="px-3 py-2 font-medium text-gray-500">Phone</th>
                            <th className="px-3 py-2 font-medium text-gray-500">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {previewRows.map((r) => (
                            <tr key={r.row} className="border-t border-gray-100 dark:border-gray-700">
                              <td className="px-3 py-2 text-gray-500">{r.row}</td>
                              <td className="px-3 py-2 text-gray-900 dark:text-gray-100">{r.full_name || '—'}</td>
                              <td className="px-3 py-2 text-gray-600 dark:text-gray-300 break-all">{r.email || '—'}</td>
                              <td className="px-3 py-2 text-gray-600 dark:text-gray-300">{r.phone || '—'}</td>
                              <td className="px-3 py-2">
                                {r.issues.length === 0 ? (
                                  <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 dark:text-green-400"><Check className="w-3.5 h-3.5" /> OK</span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 dark:text-amber-400"><AlertTriangle className="w-3.5 h-3.5" /> {r.issues.join('; ')}</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Rows with issues will be reported as failed after import — the rest are still created. Emails that already exist are caught during import.</p>
                  </div>
                )}

                <div className="pt-4 border-t border-gray-100 dark:border-gray-700 flex justify-end gap-3">
                  <button type="button" onClick={closeModal} className="px-5 py-2.5 text-gray-600 dark:text-gray-300 font-medium hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition">Cancel</button>
                  <button
                    type="button"
                    onClick={handleImport}
                    disabled={isSubmitting || previewRows.length === 0}
                    className="px-5 py-2.5 bg-brand-600 text-white font-medium rounded-xl hover:bg-brand-700 transition disabled:opacity-50 flex items-center gap-2"
                  >
                    {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                    Import {previewRows.length > 0 ? `${previewRows.length} users` : 'users'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
