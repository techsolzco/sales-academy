'use server'

import { createClient } from '@/lib/supabase/server'
import type { SearchResultItem } from '@/types'

export async function globalSearch(query: string): Promise<{ data: SearchResultItem[] }> {
  const q = query.trim().toLowerCase()
  if (!q || q.length < 2) return { data: [] }

  const supabase = await createClient()

  // Run search queries in parallel across all published entities
  const [faqsRes, scriptsRes, objectionsRes, toolsRes, lessonsRes] = await Promise.all([
    supabase
      .from('faqs')
      .select('id, question, short_answer, category, tags').is('deleted_at', null)
      .eq('status', 'published')
      .or(`question.ilike.%${q}%,short_answer.ilike.%${q}%,detailed_answer.ilike.%${q}%,category.ilike.%${q}%`)
      .limit(5),

    supabase
      .from('scripts')
      .select('id, title, content, script_type, language').is('deleted_at', null)
      .eq('status', 'published')
      .or(`title.ilike.%${q}%,content.ilike.%${q}%,when_to_use.ilike.%${q}%,script_type.ilike.%${q}%`)
      .limit(5),

    supabase
      .from('objections')
      .select('id, objection_text, recommended_response, meaning').is('deleted_at', null)
      .eq('status', 'published')
      .or(`objection_text.ilike.%${q}%,recommended_response.ilike.%${q}%,meaning.ilike.%${q}%`)
      .limit(5),

    supabase
      .from('tools')
      .select('id, name, description, category').is('deleted_at', null)
      .eq('status', 'published')
      .or(`name.ilike.%${q}%,description.ilike.%${q}%,category.ilike.%${q}%`)
      .limit(5),

    supabase
      .from('lessons')
      .select('id, title, description, module_id').is('deleted_at', null)
      .eq('status', 'published')
      .or(`title.ilike.%${q}%,description.ilike.%${q}%`)
      .limit(5),
  ])

  const results: SearchResultItem[] = []

  // FAQs
  for (const item of faqsRes.data ?? []) {
    results.push({
      id: item.id,
      type: 'faq',
      title: item.question,
      description: item.short_answer,
      url: `/dashboard/faqs#faq-${item.id}`,
      category: item.category,
      tags: item.tags,
    })
  }

  // Scripts
  for (const item of scriptsRes.data ?? []) {
    results.push({
      id: item.id,
      type: 'script',
      title: item.title,
      description: item.content.slice(0, 120) + '…',
      url: `/dashboard/scripts#script-${item.id}`,
      category: item.script_type.replace(/_/g, ' '),
    })
  }

  // Objections
  for (const item of objectionsRes.data ?? []) {
    results.push({
      id: item.id,
      type: 'objection',
      title: item.objection_text,
      description: item.recommended_response.slice(0, 120) + '…',
      url: `/dashboard/objections#obj-${item.id}`,
    })
  }

  // Tools
  for (const item of toolsRes.data ?? []) {
    results.push({
      id: item.id,
      type: 'tool',
      title: item.name,
      description: item.description,
      url: `/dashboard/tools#tool-${item.id}`,
      category: item.category,
    })
  }

  // Lessons
  for (const item of lessonsRes.data ?? []) {
    results.push({
      id: item.id,
      type: 'lesson',
      title: item.title,
      description: item.description,
      url: `/dashboard/training`,
    })
  }

  return { data: results }
}
