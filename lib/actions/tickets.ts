'use server'

import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import { ActionResult, SupportTicket, TicketMessage } from '@/types'

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!
  return createServiceClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

export async function createTicket(subject: string, description: string, category: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: ticket, error } = await supabase
    .from('support_tickets')
    .insert([{ user_id: user.id, subject, description, category }])
    .select()
    .single()

  if (error || !ticket) return { error: error?.message || 'Failed to create ticket' }

  const serviceClient = getServiceClient()
  const { data: admins } = await serviceClient
    .from('profiles')
    .select('id')
    .eq('role', 'admin')

  if (admins && admins.length > 0) {
    const notifs = admins.map((a: any) => ({
      user_id: a.id,
      title: `New support ticket: ${subject}`,
      body: description,
      type: 'system',
      link: `/admin/support/${ticket.id}`,
    }))
    await serviceClient.from('notifications').insert(notifs)
  }

  revalidatePath('/dashboard/support')
  return { data: undefined }
}

export async function fetchMyTickets(): Promise<SupportTicket[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await supabase
    .from('support_tickets')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  return data || []
}

export async function fetchAllTickets(status?: string): Promise<SupportTicket[]> {
  const supabase = await createClient()
  let query = supabase
    .from('support_tickets')
    .select(`
      *,
      profile:profiles(full_name, email)
    `)
    .order('created_at', { ascending: false })

  if (status) {
    query = query.eq('status', status)
  }

  const { data } = await query
  return data || []
}

export async function fetchTicket(id: string): Promise<(SupportTicket & { messages: TicketMessage[] }) | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('support_tickets')
    .select(`
      *,
      ticket_messages(*, sender:profiles(id, full_name, avatar_url, role)),
      profile:profiles(id, full_name, email, avatar_url)
    `)
    .eq('id', id)
    .single()

  if (error || !data) return null

  return {
    ...data,
    messages: (data.ticket_messages || []).sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
  }
}

export async function updateTicketStatus(id: string, status: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: ticket, error } = await supabase
    .from('support_tickets')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error || !ticket) return { error: error?.message || 'Failed to update ticket' }

  const serviceClient = getServiceClient()
  await serviceClient.from('notifications').insert({
    user_id: ticket.user_id,
    title: `Your ticket status changed to ${status}`,
    body: `Ticket: ${ticket.subject}`,
    type: 'system',
    link: `/dashboard/support/${ticket.id}`,
  })

  revalidatePath(`/admin/support/${id}`)
  revalidatePath('/admin/support')
  revalidatePath(`/dashboard/support/${id}`)
  return { data: undefined }
}

export async function addTicketMessage(ticketId: string, content: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  
  const { error } = await supabase
    .from('ticket_messages')
    .insert([{ ticket_id: ticketId, sender_id: user.id, content }])

  if (error) return { error: error.message }

  const serviceClient = getServiceClient()
  
  const { data: ticket } = await serviceClient
    .from('support_tickets')
    .select('user_id, subject')
    .eq('id', ticketId)
    .single()

  if (ticket) {
    if (profile?.role === 'admin') {
      await serviceClient.from('notifications').insert({
        user_id: ticket.user_id,
        title: `New response on your ticket`,
        body: `Ticket: ${ticket.subject}`,
        type: 'system',
        link: `/dashboard/support/${ticketId}`,
      })
    } else {
      const { data: admins } = await serviceClient
        .from('profiles')
        .select('id')
        .eq('role', 'admin')

      if (admins && admins.length > 0) {
        const notifs = admins.map((a: any) => ({
          user_id: a.id,
          title: `New message on ticket: ${ticket.subject}`,
          body: content.substring(0, 100) + (content.length > 100 ? '...' : ''),
          type: 'system',
          link: `/admin/support/${ticketId}`,
        }))
        await serviceClient.from('notifications').insert(notifs)
      }
    }
  }

  revalidatePath(`/admin/support/${ticketId}`)
  revalidatePath(`/dashboard/support/${ticketId}`)
  return { data: undefined }
}
