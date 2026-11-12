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

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') throw new Error('Forbidden')
  return { supabase, user }
}

async function requireAuth() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')
  return { supabase, user }
}

// The ticket status enum in types/index.ts (SupportTicket.status) — there is
// no 'waiting'/'answered' value anywhere in the codebase, so an admin reply
// moves a ticket to the existing in-progress status.
const TICKET_STATUSES = ['open', 'in-progress', 'resolved', 'closed'] as const

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
  // B24: admin-only. (List functions return [] instead of throwing so the
  // admin list page degrades to empty rather than crashing for a non-admin.)
  try {
    const { supabase } = await requireAdmin()
    if (status && !(TICKET_STATUSES as readonly string[]).includes(status)) return []
    let query = supabase
      .from('support_tickets')
      .select(`
        *,
        profile:profiles(full_name, email)
      `)
      // B47: order by updated_at so a ticket an admin just replied to
      // surfaces at the top instead of sinking by its creation date.
      .order('updated_at', { ascending: false })

    if (status) {
      query = query.eq('status', status)
    }

    const { data } = await query
    return data || []
  } catch {
    return []
  }
}

export async function fetchTicket(id: string): Promise<(SupportTicket & { messages: TicketMessage[] }) | null> {
  // B24: require a session + ownership (ticket owner or admin). RLS also
  // restricts selects to own tickets / admins, but the code must enforce it
  // rather than relying on RLS alone.
  try {
    const { supabase, user } = await requireAuth()
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    const isAdmin = profile?.role === 'admin'

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
    if (!isAdmin && data.user_id !== user.id) return null

    return {
      ...data,
      messages: (data.ticket_messages || []).sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    }
  } catch {
    return null
  }
}

export async function updateTicketStatus(id: string, status: string): Promise<ActionResult> {
  // B24: admin-only + validate the status against the allowed set.
  try {
    const { supabase } = await requireAdmin()
    if (!(TICKET_STATUSES as readonly string[]).includes(status)) {
      return { error: `Invalid ticket status: ${status}` }
    }

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
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unauthorized' }
  }
}

export async function addTicketMessage(ticketId: string, content: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  const isAdmin = profile?.role === 'admin'

  // B24: verify the caller is the ticket owner or an admin before accepting
  // the message. Look the ticket up via the service client so the ownership
  // check itself cannot be bypassed by a crafted RLS result.
  const serviceClient = getServiceClient()
  const { data: ticket } = await serviceClient
    .from('support_tickets')
    .select('user_id, subject, status')
    .eq('id', ticketId)
    .single()

  if (!ticket) return { error: 'Ticket not found' }
  if (!isAdmin && ticket.user_id !== user.id) return { error: 'Forbidden' }

  const { error } = await supabase
    .from('ticket_messages')
    .insert([{ ticket_id: ticketId, sender_id: user.id, content }])

  if (error) return { error: error.message }

  // B47: an admin reply moves the ticket to 'in-progress' (the codebase's
  // existing status for a ticket being worked on — there is no
  // 'waiting'/'answered' value in the SupportTicket status enum) and bumps
  // updated_at so it surfaces at the top of the admin list (which now
  // orders by updated_at). Only advance 'open' tickets; never regress a
  // resolved/closed ticket.
  if (isAdmin && ticket.status === 'open') {
    const { error: statusError } = await supabase
      .from('support_tickets')
      .update({ status: 'in-progress', updated_at: new Date().toISOString() })
      .eq('id', ticketId)
    if (statusError) {
      console.error('[tickets.addTicketMessage] failed to move ticket to in-progress', { ticketId, error: statusError.message })
    }
  } else if (isAdmin) {
    const { error: touchError } = await supabase
      .from('support_tickets')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', ticketId)
    if (touchError) {
      console.error('[tickets.addTicketMessage] failed to bump ticket updated_at', { ticketId, error: touchError.message })
    }
  }

  if (ticket) {
    if (isAdmin) {
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
  revalidatePath('/admin/support')
  revalidatePath('/dashboard/support')
  return { data: undefined }
}
