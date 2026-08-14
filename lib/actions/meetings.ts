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

    const notifs = finalInvitees.map(id => ({
      user_id: id,
      title: `New meeting scheduled: ${meeting.title}`,
      body: `Scheduled for ${new Date(meeting.scheduled_at).toLocaleString()}`,
      type: 'system',
      link: `/dashboard/meetings/${meeting.id}`
    }))
    await serviceClient.from('notifications').insert(notifs)
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

  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()

  const { data, error } = await supabase
    .from('meetings')
    .select('*')
    .gte('scheduled_at', oneHourAgo)
    .order('scheduled_at', { ascending: true })

  if (error || !data) return []
  return data as Meeting[]
}

export async function fetchMeeting(id: string): Promise<(Meeting & { invitees: Profile[] }) | null> {
  const supabase = await createClient()
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

  return {
    ...data,
    invitees: data.meeting_invitees?.map((mi: any) => mi.profile).filter(Boolean) || []
  }
}

export async function updateMeeting(id: string, input: Partial<Meeting>): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return { error: 'Unauthorized' }

  const { error } = await supabase
    .from('meetings')
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) return { error: error.message }

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

  const { error } = await supabase
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

  const notifs = userIds.map(id => ({
    user_id: id,
    title: `New meeting scheduled: ${meeting.title}`,
    body: `Scheduled for ${new Date(meeting.scheduled_at).toLocaleString()}`,
    type: 'system',
    link: `/dashboard/meetings/${meetingId}`
  }))
  await serviceClient.from('notifications').insert(notifs)

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
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('role', 'salesman')
    .eq('status', 'active')
    .order('full_name', { ascending: true })

  if (error || !data) return []
  return data as Profile[]
}
