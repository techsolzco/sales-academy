'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function toggleReviewStatus(contentId: string, contentType: string, markReviewed: boolean) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  if (markReviewed) {
    await supabase.from('kb_reviews').insert({
      user_id: user.id,
      content_id: contentId,
      content_type: contentType
    })
  } else {
    await supabase.from('kb_reviews')
      .delete()
      .eq('user_id', user.id)
      .eq('content_id', contentId)
      .eq('content_type', contentType)
  }
}
