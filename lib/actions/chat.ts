'use server'

import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import { ActionResult, Conversation, DirectMessage, Profile } from '@/types'

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!
  return createServiceClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

export async function getOrCreateConversation(otherUserId: string): Promise<ActionResult<{ conversationId: string }>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const participantA = user.id < otherUserId ? user.id : otherUserId
  const participantB = user.id < otherUserId ? otherUserId : user.id

  const { data: existing, error: findError } = await supabase
    .from('conversations')
    .select('id')
    .eq('participant_a', participantA)
    .eq('participant_b', participantB)
    .maybeSingle()

  if (existing) {
    return { data: { conversationId: existing.id } }
  }

  const { data: newConv, error: insertError } = await supabase
    .from('conversations')
    .insert([{ participant_a: participantA, participant_b: participantB }])
    .select('id')
    .single()

  if (insertError || !newConv) return { error: insertError?.message || 'Failed to create conversation' }

  return { data: { conversationId: newConv.id } }
}

export async function fetchConversations(): Promise<Conversation[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await supabase
    .from('conversations')
    .select(`
      *,
      profile_a:profiles!conversations_participant_a_fkey(id, full_name, avatar_url),
      profile_b:profiles!conversations_participant_b_fkey(id, full_name, avatar_url)
    `)
    .or(`participant_a.eq.${user.id},participant_b.eq.${user.id}`)
    .order('last_message_at', { ascending: false })

  return data || []
}

export async function fetchMessages(conversationId: string): Promise<DirectMessage[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('direct_messages')
    .select(`
      *,
      sender:profiles!direct_messages_sender_id_fkey(id, full_name, avatar_url)
    `)
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })

  return data || []
}

export async function sendMessage(conversationId: string, content: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: conv } = await supabase
    .from('conversations')
    .select('participant_a, participant_b')
    .eq('id', conversationId)
    .single()

  if (!conv) return { error: 'Conversation not found' }

  const otherParticipantId = conv.participant_a === user.id ? conv.participant_b : conv.participant_a

  const { error: insertError } = await supabase
    .from('direct_messages')
    .insert([{ conversation_id: conversationId, sender_id: user.id, content }])

  if (insertError) return { error: insertError.message }

  await supabase
    .from('conversations')
    .update({ last_message_at: new Date().toISOString() })
    .eq('id', conversationId)

  const serviceClient = getServiceClient()
  
  const { data: senderProfile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .single()

  await serviceClient.from('notifications').insert({
    user_id: otherParticipantId,
    title: `New message from ${senderProfile?.full_name || 'someone'}`,
    body: content.substring(0, 100) + (content.length > 100 ? '...' : ''),
    type: 'system',
    link: `/dashboard/chat?c=${conversationId}`,
  })

  revalidatePath('/dashboard/chat')
  revalidatePath('/admin/chat')
  return { data: undefined }
}

export async function markMessagesRead(conversationId: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('direct_messages')
    .update({ read: true })
    .eq('conversation_id', conversationId)
    .neq('sender_id', user.id)

  if (error) return { error: error.message }
  return { data: undefined }
}

export async function fetchAdminUsers(): Promise<Profile[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('role', 'admin')

  return data || []
}

export async function fetchSalesmanList(): Promise<Profile[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .in('role', ['salesman', 'student'])

  return data || []
}
