'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function toggleReviewStatus(contentId: string, contentType: string, markReviewed: boolean) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  if (markReviewed) {
    const { error } = await supabase.from('kb_reviews').insert({
      user_id: user.id,
      content_id: contentId,
      content_type: contentType
    })
    if (error && error.code !== '23505') {
      console.error('toggleReviewStatus insert error:', error)
    }
  } else {
    const { error } = await supabase.from('kb_reviews')
      .delete()
      .eq('user_id', user.id)
      .eq('content_id', contentId)
      .eq('content_type', contentType)
    if (error) {
      console.error('toggleReviewStatus delete error:', error)
    }
  }
}
