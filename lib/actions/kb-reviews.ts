'use server'

import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import { getEffectiveUser } from '@/lib/auth/get-effective-user'

export type KBContentType = 'faq' | 'objection' | 'script' | 'voice_note'

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!
  return createServiceClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

export async function toggleKbReview(contentType: KBContentType, contentId: string, reviewed: boolean) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  // Writes must land on the EFFECTIVE user (B77): while an admin
  // impersonates a student, the review belongs to the student. The
  // kb_reviews policy is `FOR ALL USING (user_id = auth.uid())` with no
  // admin exception, so an impersonated write must go through the
  // service client; a normal student write keeps the session client.
  const { userId, isImpersonating } = await getEffectiveUser()
  const writeClient = isImpersonating ? getServiceClient() : supabase

  if (reviewed) {
    const { error } = await writeClient
      .from('kb_reviews')
      .insert({
        user_id: userId,
        content_type: contentType,
        content_id: contentId
      })
    if (error && error.code !== '23505') {
      console.error('toggleKbReview insert error:', error)
      throw new Error(`Failed to mark as reviewed: ${error.message}`)
    }
  } else {
    const { error } = await writeClient
      .from('kb_reviews')
      .delete()
      .match({
        user_id: userId,
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
  const { userId } = await getEffectiveUser()

  const { data } = await supabase
    .from('kb_reviews')
    .select('content_id')
    .eq('user_id', userId)
    .eq('content_type', contentType)

  return (data ?? []).map(r => r.content_id)
}
