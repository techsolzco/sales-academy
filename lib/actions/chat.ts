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

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') throw new Error('Forbidden')
  return { supabase }
}

async function requireAuth() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')
  return { supabase, user }
}

/** Load a conversation and check the caller is one of its two participants. */
async function getConversationIfParticipant(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  conversationId: string
) {
  const { data: conv } = await supabase
    .from('conversations')
    .select('id, participant_a, participant_b')
    .eq('id', conversationId)
    .single()
  if (!conv) return null
  if (conv.participant_a !== userId && conv.participant_b !== userId) return null
  return conv
}

export async function getOrCreateConversation(otherUserId: string): Promise<ActionResult<{ conversationId: string }>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // B53: a conversation with yourself is meaningless (and would break the
  // participant_a < participant_b ordering assumption).
  if (otherUserId === user.id) return { error: 'You cannot start a conversation with yourself' }

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

  if (insertError || !newConv) {
    // B53: race — two callers both found nothing and both inserted; the loser
    // hits the UNIQUE(participant_a, participant_b) violation. Re-fetch and
    // return the conversation the other caller created instead of an error.
    if ((insertError as { code?: string } | null)?.code === '23505') {
      const { data: raced } = await supabase
        .from('conversations')
        .select('id')
        .eq('participant_a', participantA)
        .eq('participant_b', participantB)
        .maybeSingle()
      if (raced) return { data: { conversationId: raced.id } }
    }
    return { error: insertError?.message || 'Failed to create conversation' }
  }

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
  try {
    const { supabase, user } = await requireAuth()
    // B23: only a participant may read the conversation's messages.
    const conv = await getConversationIfParticipant(supabase, user.id, conversationId)
    if (!conv) return []

    const { data } = await supabase
      .from('direct_messages')
      .select(`
        *,
        sender:profiles!direct_messages_sender_id_fkey(id, full_name, avatar_url)
      `)
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })

    return data || []
  } catch {
    return []
  }
}

export async function sendMessage(conversationId: string, content: string): Promise<ActionResult<{ warnings?: string[] }>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const conv = await getConversationIfParticipant(supabase, user.id, conversationId)
  if (!conv) return { error: 'Conversation not found' }

  const otherParticipantId = conv.participant_a === user.id ? conv.participant_b : conv.participant_a

  const { error: insertError } = await supabase
    .from('direct_messages')
    .insert([{ conversation_id: conversationId, sender_id: user.id, content }])

  if (insertError) return { error: insertError.message }

  // B70: the follow-ups must not fail the send, but their failures must be
  // surfaced instead of silently ignored. NOTE: per audit §2 S16 there is no
  // UPDATE policy on `conversations`/`direct_messages`, so these updates can
  // fail RLS live until a migration adds owner-scoped UPDATE policies.
  const warnings: string[] = []

  const { error: touchError } = await supabase
    .from('conversations')
    .update({ last_message_at: new Date().toISOString() })
    .eq('id', conversationId)
  if (touchError) {
    console.error('[chat.sendMessage] last_message_at update failed', { conversationId, error: touchError.message })
    warnings.push('last_message_at update failed')
  }

  const serviceClient = getServiceClient()

  const { data: senderProfile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .single()

  // B46: send the link for the recipient's own portal, not always the
  // salesman dashboard. The recipient's role is not readable via the regular
  // client (profiles RLS: owner-or-admin only), so look it up with the
  // service client.
  const { data: recipientProfile } = await serviceClient
    .from('profiles')
    .select('role')
    .eq('id', otherParticipantId)
    .single()
  const chatLink = recipientProfile?.role === 'admin'
    ? `/admin/chat?c=${conversationId}`
    : `/dashboard/chat?c=${conversationId}`

  const { error: notifError } = await serviceClient.from('notifications').insert({
    user_id: otherParticipantId,
    title: `New message from ${senderProfile?.full_name || 'someone'}`,
    body: content.substring(0, 100) + (content.length > 100 ? '...' : ''),
    type: 'system',
    link: chatLink,
  })
  if (notifError) {
    console.error('[chat.sendMessage] notification insert failed', { conversationId, recipient: otherParticipantId, error: notifError.message })
    warnings.push('notification insert failed')
  }

  revalidatePath('/dashboard/chat')
  revalidatePath('/admin/chat')
  return { data: { warnings } }
}

export async function markMessagesRead(conversationId: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // B23: only a participant may mark this conversation's messages read.
  const conv = await getConversationIfParticipant(supabase, user.id, conversationId)
  if (!conv) return { error: 'Conversation not found' }

  const { error } = await supabase
    .from('direct_messages')
    .update({ read: true })
    .eq('conversation_id', conversationId)
    .neq('sender_id', user.id)

  if (error) return { error: error.message }
  return { data: undefined }
}

export async function fetchAdminUsers(): Promise<Profile[]> {
  // B23/S9: require a session, and return only the fields the picker needs.
  // Email is dropped (it was admin-account enumeration via the service client).
  try {
    await requireAuth()
  } catch {
    return []
  }
  const sb = getServiceClient()
  const { data } = await sb
    .from('profiles')
    .select('id, full_name, avatar_url')
    .eq('role', 'admin')
    .order('full_name')

  return (data || []) as Profile[]
}

export async function fetchSalesmanList(): Promise<Profile[]> {
  // B23/B54: admin-only. The only caller anywhere was none (dead export), and
  // the admin-only NewChatPicker path uses getActiveSalesmen instead, so
  // requireAdmin is safe. With an admin session the regular client's
  // "admin can read all" profiles policy applies — no service client needed.
  try {
    const { supabase } = await requireAdmin()
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .in('role', ['salesman', 'student'])

    return data || []
  } catch {
    return []
  }
}

export async function getActiveSalesmen() {
  // B23/B54: admin-only. Sole caller is components/chat/NewChatPicker, which
  // is rendered only by app/admin/chat/page.tsx (admin portal). A salesman
  // calling this with the regular client would only ever see their own row
  // (profiles RLS: owner-read-own), so the admin check also fixes the
  // "empty picker" risk for the legitimate admin caller.
  try {
    const { supabase } = await requireAdmin()
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, email, avatar_url')
      .eq('role', 'salesman')
      .eq('status', 'active')
      .order('full_name')
    return data || []
  } catch {
    return []
  }
}
