'use server'

import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import { ActionResult, Meeting, MeetingInvitee, Profile } from '@/types'

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

async function notifyInvitees(
  serviceClient: ReturnType<typeof getServiceClient>,
  inviteeIds: string[],
  title: string,
  body: string,
  meetingId: string
) {
  if (inviteeIds.length === 0) return
  const notifs = inviteeIds.map(id => ({
    user_id: id,
    title,
    body,
    type: 'system',
    link: `/dashboard/meetings/${meetingId}`
  }))
  const { error } = await serviceClient.from('notifications').insert(notifs)
  if (error) {
    console.error('[meetings] notification insert failed', { meetingId, title, error: error.message })
  }
}

export async function createMeeting(input: {
  title: string;
  description?: string;
  scheduled_at: string;
  course_id?: string;
  visibility: 'public' | 'invited';
  invitee_ids?: string[];
}): Promise<ActionResult<Meeting>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return { error: 'Unauthorized' }

  // B50: an invited meeting with nobody invited is a silent no-op — refuse
  // to create it instead of saving a meeting no one can attend.
  if (input.visibility === 'invited' && (!input.invitee_ids || input.invitee_ids.length === 0)) {
    return { error: 'Add at least one invitee for an invited-only meeting' }
  }

  const room_name = 'sales-academy-' + Math.random().toString(36).slice(2, 10)
  const jitsi_url = `https://meet.jit.si/${room_name}`

  const { data: meeting, error } = await supabase
    .from('meetings')
    .insert([{
      title: input.title,
      description: input.description || null,
      scheduled_at: input.scheduled_at,
      course_id: input.course_id || null,
      visibility: input.visibility,
      created_by: user.id,
      room_name,
      jitsi_url
    }])
    .select()
    .single()

  if (error || !meeting) return { error: error?.message || 'Failed to create meeting' }

  const serviceClient = getServiceClient()
  let finalInvitees: string[] = []

  if (input.visibility === 'invited' && input.invitee_ids && input.invitee_ids.length > 0) {
    finalInvitees = input.invitee_ids
  } else if (input.visibility === 'public') {
    const { data: salesmen } = await supabase
      .from('profiles')
      .select('id')
      .eq('role', 'salesman')
      .eq('status', 'active')
    
    if (salesmen) {
      finalInvitees = salesmen.map((s: any) => s.id)
    }
  }

  if (finalInvitees.length > 0) {
    const inviteesData = finalInvitees.map(id => ({
      meeting_id: meeting.id,
      user_id: id
    }))
    
    await serviceClient.from('meeting_invitees').insert(inviteesData)

    await notifyInvitees(
      serviceClient,
      finalInvitees,
      `New meeting scheduled: ${meeting.title}`,
      `Scheduled for ${new Date(meeting.scheduled_at).toLocaleString()}`,
      meeting.id
    )
  }

  revalidatePath('/dashboard/meetings')
  revalidatePath('/admin/meetings')
  return { data: meeting }
}

export async function fetchMeetings(): Promise<Meeting[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []
  
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return []

  const { data, error } = await supabase
    .from('meetings')
    .select(`
      *,
      course:courses(id, title),
      invitee_count:meeting_invitees(count)
    `)
    .order('scheduled_at', { ascending: true })

  if (error) return []

  return data.map((m: any) => ({
    ...m,
    course: m.course ? { id: m.course.id, name: m.course.title } : null,
    invitee_count: m.invitee_count?.[0]?.count || 0
  })) as Meeting[]
}

export async function fetchMyMeetings(): Promise<Meeting[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  // B11: only meetings the user is invited to or that are public. The
  // meetings RLS policy already enforces the same rule (public OR invited OR
  // creator), but the code must filter explicitly too — the previous query
  // returned every meeting to every salesman.
  const { data: myInvites } = await supabase
    .from('meeting_invitees')
    .select('meeting_id')
    .eq('user_id', user.id)
  const invitedIds = (myInvites ?? []).map((r: any) => r.meeting_id)

  // B11 (second bug): the meetings table has NO end-time/duration column
  // (008_phase8.sql), so "still running" cannot be computed. The old 1-hour
  // cutoff hid any meeting that started >1h ago even if still in progress.
  // Widened to 24h so a long/overrunning meeting stays visible for the rest
  // of its day; a real fix needs a duration_minutes column + migration.
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  let query = supabase
    .from('meetings')
    .select('*')
    .gte('scheduled_at', oneDayAgo)
    .order('scheduled_at', { ascending: true })

  if (invitedIds.length > 0) {
    query = query.or(`visibility.eq.public,id.in.(${invitedIds.join(',')})`)
  } else {
    query = query.eq('visibility', 'public')
  }

  const { data, error } = await query

  if (error || !data) return []
  return data as Meeting[]
}

export async function fetchMeeting(id: string): Promise<(Meeting & { invitees: Profile[] }) | null> {
  // B26: require a session + verify the caller is invited, the meeting is
  // public, the caller created it, or the caller is an admin.
  try {
    const { supabase, user } = await requireAuth()
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    const isAdmin = profile?.role === 'admin'

    const { data, error } = await supabase
      .from('meetings')
      .select(`
        *,
        meeting_invitees(
          profile:profiles(*)
        )
      `)
      .eq('id', id)
      .single()

    if (error || !data) return null

    // Under meeting_invitees RLS a non-admin only sees their own invitee row,
    // so presence of the caller in the embedded list means "invited".
    const embeddedInvitees = (data.meeting_invitees ?? []) as any[]
    const isInvitee = embeddedInvitees.some((mi: any) => mi.profile?.id === user.id)
    const isCreator = (data as any).created_by === user.id
    const isPublic = (data as any).visibility === 'public'

    if (!isAdmin && !isPublic && !isInvitee && !isCreator) return null

    // Only admins and invitees get full invitee profiles; a public-meeting
    // visitor who was not invited sees the meeting but no attendee list.
    let invitees: Profile[] = []
    if (isAdmin || isInvitee) {
      const serviceClient = getServiceClient()
      const { data: inviteeRows } = await serviceClient
        .from('meeting_invitees')
        .select('profile:profiles(id, full_name, email, avatar_url)')
        .eq('meeting_id', id)
      invitees = (inviteeRows ?? []).map((r: any) => r.profile).filter(Boolean) as Profile[]
    }

    return {
      ...data,
      invitees,
    }
  } catch {
    return null
  }
}

export async function updateMeeting(
  id: string,
  input: Partial<Meeting> & { invitee_ids?: string[] }
): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return { error: 'Unauthorized' }

  // B55: fetch the current meeting first — the invitee sync and the
  // reschedule notification both need the old values.
  const { data: existing } = await supabase
    .from('meetings')
    .select('id, title, scheduled_at, visibility')
    .eq('id', id)
    .single()
  if (!existing) return { error: 'Meeting not found' }

  const serviceClient = getServiceClient()
  const { data: currentInvitees } = await serviceClient
    .from('meeting_invitees')
    .select('user_id')
    .eq('meeting_id', id)
  const currentInviteeIds = new Set((currentInvitees ?? []).map((r: any) => r.user_id as string))

  // Strip non-column / nested fields out of the update payload.
  const { invitee_ids, course, invitee_count, ...meetingFields } = input as Partial<Meeting> & { invitee_ids?: string[]; course?: unknown; invitee_count?: number }
  const newVisibility = meetingFields.visibility ?? existing.visibility
  const newScheduledAt = meetingFields.scheduled_at ?? existing.scheduled_at
  const rescheduled = newScheduledAt !== existing.scheduled_at
  const visibilityChanged = newVisibility !== existing.visibility

  // Refuse an invited meeting with an empty list (B50 rule, same as create)
  // BEFORE writing anything, so the meeting is never half-updated.
  if ((invitee_ids !== undefined || visibilityChanged) && newVisibility === 'invited' && invitee_ids !== undefined && invitee_ids.length === 0) {
    return { error: 'Add at least one invitee for an invited-only meeting' }
  }

  const { error } = await supabase
    .from('meetings')
    .update({ ...meetingFields, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) return { error: error.message }

  // B55: sync meeting_invitees when visibility/invitees change — replace the
  // whole invitee set with the new one instead of leaving stale rows.
  const inviteesTouched = invitee_ids !== undefined || visibilityChanged
  let finalInviteeIds: string[] = Array.from(currentInviteeIds)
  if (inviteesTouched) {
    if (newVisibility === 'invited') {
      finalInviteeIds = invitee_ids ?? Array.from(currentInviteeIds)
    } else {
      // Public: everyone active is an invitee (same rule as createMeeting).
      const { data: salesmen } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', 'salesman')
        .eq('status', 'active')
      finalInviteeIds = (salesmen ?? []).map((s: any) => s.id as string)
    }

    const { error: deleteError } = await serviceClient
      .from('meeting_invitees')
      .delete()
      .eq('meeting_id', id)
    if (deleteError) return { error: deleteError.message }

    if (finalInviteeIds.length > 0) {
      const { error: insertError } = await serviceClient
        .from('meeting_invitees')
        .insert(finalInviteeIds.map(uid => ({ meeting_id: id, user_id: uid })))
      if (insertError) return { error: insertError.message }
    }
  }

  // B55: notify invitees of a reschedule, and notify newly added invitees.
  const newTitle = meetingFields.title ?? existing.title
  const newlyAdded = finalInviteeIds.filter(uid => !currentInviteeIds.has(uid))
  if (rescheduled) {
    await notifyInvitees(
      serviceClient,
      finalInviteeIds,
      `Meeting rescheduled: ${newTitle}`,
      `New time: ${new Date(newScheduledAt).toLocaleString()}`,
      id
    )
  } else if (newlyAdded.length > 0) {
    await notifyInvitees(
      serviceClient,
      newlyAdded,
      `You were added to a meeting: ${newTitle}`,
      `Scheduled for ${new Date(newScheduledAt).toLocaleString()}`,
      id
    )
  }

  revalidatePath('/admin/meetings')
  revalidatePath('/dashboard/meetings')
  revalidatePath(`/admin/meetings/${id}`)
  revalidatePath(`/dashboard/meetings/${id}`)
  return { data: undefined }
}

export async function deleteMeeting(id: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return { error: 'Unauthorized' }

  const serviceClient = getServiceClient()

  // B55: notify invitees BEFORE deleting, while the rows still exist.
  const { data: meeting } = await serviceClient
    .from('meetings')
    .select('title, scheduled_at')
    .eq('id', id)
    .single()
  const { data: inviteeRows } = await serviceClient
    .from('meeting_invitees')
    .select('user_id')
    .eq('meeting_id', id)
  const inviteeIds = (inviteeRows ?? []).map((r: any) => r.user_id as string)
  if (meeting && inviteeIds.length > 0) {
    await notifyInvitees(
      serviceClient,
      inviteeIds,
      `Meeting cancelled: ${meeting.title}`,
      `The meeting scheduled for ${new Date(meeting.scheduled_at).toLocaleString()} has been cancelled.`,
      id
    )
  }

  // Clean up any invitees first if necessary
  await serviceClient.from('meeting_invitees').delete().eq('meeting_id', id)

  const { error } = await serviceClient
    .from('meetings')
    .delete()
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/admin/meetings')
  revalidatePath('/dashboard/meetings')
  return { data: undefined }
}

export async function addInvitees(meetingId: string, userIds: string[]): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return { error: 'Unauthorized' }

  const { data: meeting } = await supabase.from('meetings').select('title, scheduled_at').eq('id', meetingId).single()
  if (!meeting) return { error: 'Meeting not found' }

  const serviceClient = getServiceClient()
  const inviteesData = userIds.map(id => ({
    meeting_id: meetingId,
    user_id: id
  }))

  const { error } = await serviceClient
    .from('meeting_invitees')
    .upsert(inviteesData, { onConflict: 'meeting_id,user_id', ignoreDuplicates: true })

  if (error) return { error: error.message }

  await notifyInvitees(
    serviceClient,
    userIds,
    `New meeting scheduled: ${meeting.title}`,
    `Scheduled for ${new Date(meeting.scheduled_at).toLocaleString()}`,
    meetingId
  )

  revalidatePath(`/admin/meetings/${meetingId}`)
  revalidatePath(`/dashboard/meetings/${meetingId}`)
  return { data: undefined }
}

export async function removeInvitee(meetingId: string, userId: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return { error: 'Unauthorized' }

  const { error } = await supabase
    .from('meeting_invitees')
    .delete()
    .eq('meeting_id', meetingId)
    .eq('user_id', userId)

  if (error) return { error: error.message }

  revalidatePath(`/admin/meetings/${meetingId}`)
  revalidatePath(`/dashboard/meetings/${meetingId}`)
  return { data: undefined }
}

export async function fetchSalesmen(): Promise<Profile[]> {
  // B23: admin-only. Sole caller is app/admin/meetings/new/page.tsx
  // (admin portal). With an admin session the regular client's "admin can
  // read all" profiles policy applies — no service client needed.
  try {
    const { supabase } = await requireAdmin()
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'salesman')
      .eq('status', 'active')
      .order('full_name', { ascending: true })

    if (error || !data) return []
    return data as Profile[]
  } catch {
    return []
  }
}
