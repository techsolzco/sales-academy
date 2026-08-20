'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export type KBContentType = 'faq' | 'objection' | 'script' | 'voice_note'

export async function toggleKbReview(contentType: KBContentType, contentId: string, reviewed: boolean) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  if (reviewed) {
    const { error } = await supabase
      .from('kb_reviews')
      .insert({
        user_id: user.id,
        content_type: contentType,
        content_id: contentId
      })
    if (error && error.code !== '23505') {
      console.error('toggleKbReview insert error:', error)
      throw new Error(`Failed to mark as reviewed: ${error.message}`)
    }
  } else {
    const { error } = await supabase
      .from('kb_reviews')
      .delete()
      .match({
        user_id: user.id,
        content_type: contentType,
        content_id: contentId
      })
    if (error) {
      console.error('toggleKbReview delete error:', error)
      throw new Error(`Failed to unmark as reviewed: ${error.message}`)
    }
  }

  revalidatePath('/dashboard/faqs')
  revalidatePath('/dashboard/objections')
  revalidatePath('/dashboard/scripts')
}

export async function getReviewedKbItems(contentType: KBContentType) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await supabase
    .from('kb_reviews')
    .select('content_id')
    .eq('user_id', user.id)
    .eq('content_type', contentType)

  return (data ?? []).map(r => r.content_id)
}
