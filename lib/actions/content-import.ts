'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { ActionResult, Difficulty, ScriptType, Status } from '@/types'
import { createScript, type ScriptInput } from './scripts'
import { createFAQ, type FAQInput } from './faqs'
import { createObjection, type ObjectionInput } from './objections'

// Bulk content import for scripts / FAQs / objections via CSV (audit §3 #14).
// Each row is validated and inserted on its own; one bad row never aborts
// the batch. Rows are inserted through the same single-create actions the
// managers use, so defaults, knowledge sync and revalidation stay identical.

export type ImportContentType = 'script' | 'faq' | 'objection'

export interface ImportFailure {
  /** CSV file line number (header is line 1). */
  row: number
  reason: string
}

export interface ImportResult {
  created: number
  failed: ImportFailure[]
}

const MAX_ROWS_PER_IMPORT = 500

const SCRIPT_TYPES: ScriptType[] = [
  'greeting',
  'whatsapp',
  'voice_note_script',
  'follow_up',
  'closing',
  'payment',
  'objection_response',
  'upsell',
  'cross_sell',
  'after_sales',
  'review_request',
  'warranty_explanation',
]

const DIFFICULTIES: Difficulty[] = ['beginner', 'intermediate', 'advanced']
const STATUSES: Status[] = ['draft', 'published', 'archived']

const REVALIDATE_PATHS: Record<ImportContentType, string[]> = {
  script: ['/admin/scripts', '/dashboard/scripts'],
  faq: ['/admin/faqs', '/dashboard/faqs'],
  objection: ['/admin/objections', '/dashboard/objections'],
}

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')
  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') throw new Error('Forbidden')
  return { supabase, user }
}

/** Normalise CSV header names: "Short Answer" / "short-answer" -> "short_answer". */
function normaliseRow(row: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [key, value] of Object.entries(row)) {
    const normalised = key.trim().toLowerCase().replace(/[\s-]+/g, '_')
    if (normalised) out[normalised] = value ?? ''
  }
  return out
}

/** First non-empty value across flexible header aliases. */
function pick(row: Record<string, string>, ...names: string[]): string | undefined {
  for (const name of names) {
    const value = row[name]
    if (value !== undefined && value.trim() !== '') return value.trim()
  }
  return undefined
}

function parseTags(value: string | undefined): string[] {
  if (!value) return []
  return value.split(',').map(t => t.trim()).filter(Boolean)
}

function parseStatus(value: string | undefined, rowLabel: string): Status | { error: string } {
  if (!value) return 'draft'
  const status = value.toLowerCase() as Status
  if (!STATUSES.includes(status)) {
    return { error: `${rowLabel}: invalid status "${value}" (expected one of: ${STATUSES.join(', ')})` }
  }
  return status
}

function buildScriptInput(row: Record<string, string>): ScriptInput | { error: string } {
  const title = pick(row, 'title', 'name', 'heading')
  if (!title) return { error: 'Missing required field: title' }
  const content = pick(row, 'content', 'body', 'text', 'script')
  if (!content) return { error: 'Missing required field: content' }

  const scriptTypeRaw = pick(row, 'script_type', 'type')
  let scriptType: ScriptType = 'whatsapp'
  if (scriptTypeRaw) {
    const candidate = scriptTypeRaw.toLowerCase() as ScriptType
    if (!SCRIPT_TYPES.includes(candidate)) {
      return { error: `Invalid script_type "${scriptTypeRaw}" (expected one of: ${SCRIPT_TYPES.join(', ')})` }
    }
    scriptType = candidate
  }

  const status = parseStatus(pick(row, 'status'), 'script')
  if (typeof status === 'object') return status

  return {
    title,
    script_type: scriptType,
    language: pick(row, 'language') || 'English',
    content,
    content_hinglish: pick(row, 'content_hinglish', 'hinglish', 'content_urdu'),
    when_to_use: pick(row, 'when_to_use'),
    related_product: pick(row, 'related_product', 'product'),
    related_objection: pick(row, 'related_objection', 'objection'),
    tags: parseTags(pick(row, 'tags')),
    status,
    tool_id: pick(row, 'tool_id', 'tool') || null,
  }
}

function buildFAQInput(row: Record<string, string>): FAQInput | { error: string } {
  const question = pick(row, 'question', 'title', 'name')
  if (!question) return { error: 'Missing required field: question' }
  const shortAnswer = pick(row, 'answer', 'short_answer', 'content', 'response', 'body')
  if (!shortAnswer) return { error: 'Missing required field: answer' }

  const status = parseStatus(pick(row, 'status'), 'faq')
  if (typeof status === 'object') return status

  const priorityRaw = pick(row, 'priority')
  const priority = priorityRaw === undefined ? 0 : Number.parseInt(priorityRaw, 10)
  if (Number.isNaN(priority)) return { error: `Invalid priority "${priorityRaw}" (expected a number)` }

  return {
    question,
    question_hinglish: pick(row, 'question_hinglish', 'question_urdu'),
    short_answer: shortAnswer,
    short_answer_hinglish: pick(row, 'short_answer_hinglish', 'answer_hinglish'),
    detailed_answer: pick(row, 'detailed_answer', 'detailed', 'long_answer'),
    customer_ready_answer: pick(row, 'customer_ready_answer', 'customer_answer'),
    customer_ready_answer_hinglish: pick(row, 'customer_ready_answer_hinglish'),
    category: pick(row, 'category') || 'General',
    tags: parseTags(pick(row, 'tags')),
    priority,
    status,
    tool_id: pick(row, 'tool_id', 'tool') || null,
  }
}

function buildObjectionInput(row: Record<string, string>): ObjectionInput | { error: string } {
  const objectionText = pick(row, 'objection_text', 'objection', 'title', 'question')
  if (!objectionText) return { error: 'Missing required field: objection_text (title/objection)' }
  const recommendedResponse = pick(row, 'recommended_response', 'response', 'answer', 'reply')
  if (!recommendedResponse) return { error: 'Missing required field: recommended_response (response/answer)' }

  const status = parseStatus(pick(row, 'status'), 'objection')
  if (typeof status === 'object') return status

  const difficultyRaw = pick(row, 'difficulty')
  let difficulty: Difficulty | undefined
  if (difficultyRaw) {
    const candidate = difficultyRaw.toLowerCase() as Difficulty
    if (!DIFFICULTIES.includes(candidate)) {
      return { error: `Invalid difficulty "${difficultyRaw}" (expected one of: ${DIFFICULTIES.join(', ')})` }
    }
    difficulty = candidate
  }

  return {
    objection_text: objectionText,
    meaning: pick(row, 'meaning'),
    recommended_response: recommendedResponse,
    recommended_response_hinglish: pick(row, 'recommended_response_hinglish', 'response_hinglish'),
    alternative_response: pick(row, 'alternative_response', 'alternative'),
    do_not_say: pick(row, 'do_not_say'),
    category: pick(row, 'category'),
    related_product: pick(row, 'related_product', 'product'),
    related_lesson_id: pick(row, 'related_lesson_id', 'lesson_id'),
    difficulty,
    status,
    tool_id: pick(row, 'tool_id', 'tool') || null,
  }
}

export async function importContent(
  contentType: ImportContentType,
  rows: Record<string, string>[],
): Promise<ActionResult<ImportResult>> {
  try {
    await requireAdmin()

    if (!rows || rows.length === 0) return { error: 'No rows to import' }
    if (rows.length > MAX_ROWS_PER_IMPORT) {
      return { error: `Too many rows (${rows.length}). Import at most ${MAX_ROWS_PER_IMPORT} rows at a time.` }
    }

    const result: ImportResult = { created: 0, failed: [] }

    for (let i = 0; i < rows.length; i++) {
      // Row numbers match the CSV file: header is line 1, first data row is 2.
      const rowNumber = i + 2
      const row = normaliseRow(rows[i])
      const isEmpty = Object.values(row).every(v => v.trim() === '')
      if (isEmpty) continue

      let createError: string | undefined
      if (contentType === 'script') {
        const input = buildScriptInput(row)
        if ('error' in input) {
          result.failed.push({ row: rowNumber, reason: input.error })
          continue
        }
        const res = await createScript(input)
        createError = res.error
      } else if (contentType === 'faq') {
        const input = buildFAQInput(row)
        if ('error' in input) {
          result.failed.push({ row: rowNumber, reason: input.error })
          continue
        }
        const res = await createFAQ(input)
        createError = res.error
      } else if (contentType === 'objection') {
        const input = buildObjectionInput(row)
        if ('error' in input) {
          result.failed.push({ row: rowNumber, reason: input.error })
          continue
        }
        const res = await createObjection(input)
        createError = res.error
      } else {
        return { error: `Unknown content type: ${String(contentType)}` }
      }

      if (createError) {
        result.failed.push({ row: rowNumber, reason: createError })
      } else {
        result.created += 1
      }
    }

    for (const path of REVALIDATE_PATHS[contentType]) revalidatePath(path)
    return { data: result }
  } catch (e: unknown) {
    return { error: (e as Error).message }
  }
}
