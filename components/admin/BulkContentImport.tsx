'use client'

import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, FileUp, Loader2, Upload, XCircle } from 'lucide-react'
import { importContent, type ImportContentType, type ImportResult } from '@/lib/actions/content-import'

interface BulkContentImportProps {
  /** Fix the content type (hides the selector). Omit to let the admin choose. */
  contentType?: ImportContentType
  onImported?: () => void
}

const TYPE_LABELS: Record<ImportContentType, string> = {
  script: 'Scripts',
  faq: 'FAQs',
  objection: 'Objections',
}

const EXPECTED_COLUMNS: Record<ImportContentType, string> = {
  script: 'title, content (required) · script_type, language, content_hinglish, when_to_use, related_product, related_objection, tags, status, tool_id',
  faq: 'question, answer (required) · question_hinglish, short_answer_hinglish, detailed_answer, customer_ready_answer, category, tags, priority, status, tool_id',
  objection: 'title/objection, response (required) · meaning, recommended_response_hinglish, alternative_response, do_not_say, category, related_product, difficulty, status, tool_id',
}

const PREVIEW_ROWS = 8

/** Minimal CSV parser (no new dependencies): handles quoted fields, commas
 *  and newlines inside quotes, and CRLF line endings. First row = headers. */
export function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = []
  let field = ''
  let row: string[] = []
  let inQuotes = false

  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        field += char
      }
    } else if (char === '"') {
      inQuotes = true
    } else if (char === ',') {
      row.push(field)
      field = ''
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && text[i + 1] === '\n') i++
      row.push(field)
      field = ''
      rows.push(row)
      row = []
    } else {
      field += char
    }
  }
  if (field !== '' || row.length > 0) {
    row.push(field)
    rows.push(row)
  }

  const nonEmpty = rows.filter(r => r.some(cell => cell.trim() !== ''))
  if (nonEmpty.length === 0) return []
  const headers = nonEmpty[0].map(h => h.trim())
  return nonEmpty.slice(1).map(r => {
    const record: Record<string, string> = {}
    headers.forEach((header, idx) => {
      if (header) record[header] = (r[idx] ?? '').trim()
    })
    return record
  })
}

export function BulkContentImport({ contentType, onImported }: BulkContentImportProps) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [type, setType] = useState<ImportContentType>(contentType ?? 'script')
  const [csvText, setCsvText] = useState('')
  const [fileName, setFileName] = useState<string | null>(null)
  const [parseError, setParseError] = useState<string | null>(null)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const effectiveType = contentType ?? type
  const parsedRows = csvText.trim() ? parseCsv(csvText) : []
  const headers = parsedRows.length > 0 ? Object.keys(parsedRows[0]) : []

  function handleFile(file: File | undefined) {
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      setCsvText(String(reader.result ?? ''))
      setFileName(file.name)
      setParseError(null)
      setResult(null)
      setError(null)
    }
    reader.onerror = () => setParseError('Could not read that file. Try pasting the CSV text instead.')
    reader.readAsText(file)
  }

  function handleSubmit() {
    if (parsedRows.length === 0) {
      setParseError('Nothing to import — pick a CSV file or paste CSV text with a header row first.')
      return
    }
    setError(null)
    setResult(null)
    startTransition(async () => {
      const res = await importContent(effectiveType, parsedRows)
      if (res.error) {
        setError(res.error)
        return
      }
      setResult(res.data ?? null)
      router.refresh()
      onImported?.()
    })
  }

  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 sm:p-5">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
        <FileUp className="w-4 h-4" /> Bulk import (CSV)
      </h3>
      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
        Import many {TYPE_LABELS[effectiveType].toLowerCase()} at once. One bad row fails on its own —
        the rest still import. Max 500 rows per import.
      </p>

      {!contentType && (
        <div className="mt-4">
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Content type</label>
          <select
            value={type}
            onChange={e => {
              setType(e.target.value as ImportContentType)
              setResult(null)
              setError(null)
            }}
            className="px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-400"
          >
            {(Object.keys(TYPE_LABELS) as ImportContentType[]).map(t => (
              <option key={t} value={t}>{TYPE_LABELS[t]}</option>
            ))}
          </select>
        </div>
      )}

      <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
        Expected columns: {EXPECTED_COLUMNS[effectiveType]}
      </p>

      <div className="mt-3 flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={e => handleFile(e.target.files?.[0])}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            <Upload className="w-4 h-4" /> Choose CSV file
          </button>
          {fileName && <span className="text-xs text-gray-500 dark:text-gray-400 truncate">{fileName}</span>}
        </div>

        <textarea
          value={csvText}
          onChange={e => {
            setCsvText(e.target.value)
            setFileName(null)
            setParseError(null)
            setResult(null)
            setError(null)
          }}
          rows={5}
          placeholder={`Or paste CSV text here — first row must be the header, e.g.\ntitle,content,script_type\nWelcome call,Assalam-o-Alaikum…,whatsapp`}
          className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-400 font-mono"
        />
      </div>

      {parseError && (
        <p className="mt-3 flex items-center gap-1.5 text-sm text-red-600 dark:text-red-400">
          <XCircle className="w-4 h-4" /> {parseError}
        </p>
      )}

      {parsedRows.length > 0 && (
        <div className="mt-4">
          <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
            Preview — {parsedRows.length} row{parsedRows.length === 1 ? '' : 's'} ready
            {parsedRows.length > PREVIEW_ROWS ? ` (showing first ${PREVIEW_ROWS})` : ''}
          </p>
          <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-700/50 text-left">
                  {headers.map(h => (
                    <th key={h} className="px-3 py-2 font-medium text-gray-700 dark:text-gray-200 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {parsedRows.slice(0, PREVIEW_ROWS).map((row, i) => (
                  <tr key={i} className="border-t border-gray-100 dark:border-gray-700">
                    {headers.map(h => (
                      <td key={h} className="px-3 py-2 text-gray-600 dark:text-gray-300 max-w-48 truncate">{row[h]}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button
            onClick={handleSubmit}
            disabled={isPending}
            className="mt-4 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 text-white font-medium text-sm hover:bg-brand-700 transition shadow-sm disabled:opacity-50"
          >
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            Import {parsedRows.length} {TYPE_LABELS[effectiveType].toLowerCase()}
          </button>
        </div>
      )}

      {error && (
        <p className="mt-4 flex items-center gap-1.5 text-sm text-red-600 dark:text-red-400">
          <XCircle className="w-4 h-4" /> {error}
        </p>
      )}

      {result && (
        <div className="mt-4 rounded-xl border border-gray-200 dark:border-gray-700 p-3">
          <p className="flex items-center gap-1.5 text-sm font-medium text-gray-900 dark:text-white">
            <CheckCircle2 className="w-4 h-4 text-green-600" />
            Import finished — {result.created} created
            {result.failed.length > 0 ? `, ${result.failed.length} failed` : ', none failed'}
          </p>
          {result.failed.length > 0 && (
            <ul className="mt-2 space-y-1">
              {result.failed.map(f => (
                <li key={f.row} className="text-xs text-red-600 dark:text-red-400">
                  Row {f.row}: {f.reason}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
