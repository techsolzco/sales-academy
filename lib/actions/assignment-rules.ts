'use server'

import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!
  return createServiceClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') throw new Error('Forbidden')
  return { supabase, user }
}

// ── Rule CRUD ────────────────────────────────────────────────────────────────

export async function upsertAssignmentRule(toolId: string, input: {
  daily_faqs: number
  daily_scripts: number
  daily_objections: number
  applies_to: 'all' | 'specific'
  enabled: boolean
  user_ids?: string[]
}) {
  try {
    const { supabase, user } = await requireAdmin()

    const { data: existing } = await supabase
      .from('assignment_rules')
      .select('id')
      .eq('tool_id', toolId)
      .maybeSingle()

    let ruleId: string
    if (existing) {
      const { error } = await supabase.from('assignment_rules').update({
        daily_faqs: input.daily_faqs,
        daily_scripts: input.daily_scripts,
        daily_objections: input.daily_objections,
        applies_to: input.applies_to,
        enabled: input.enabled,
        updated_at: new Date().toISOString(),
      }).eq('id', existing.id)
      if (error) return { error: error.message }
      ruleId = existing.id
    } else {
      const { data, error } = await supabase.from('assignment_rules').insert({
        tool_id: toolId,
        daily_faqs: input.daily_faqs,
        daily_scripts: input.daily_scripts,
        daily_objections: input.daily_objections,
        applies_to: input.applies_to,
        enabled: input.enabled,
        created_by: user.id,
      }).select('id').single()
      if (error || !data) return { error: error?.message || 'Failed to create rule' }
      ruleId = data.id
    }

    // Sync specific users
    if (input.applies_to === 'specific' && input.user_ids !== undefined) {
      await supabase.from('assignment_rule_users').delete().eq('rule_id', ruleId)
      if (input.user_ids.length > 0) {
        await supabase.from('assignment_rule_users').insert(
          input.user_ids.map(uid => ({ rule_id: ruleId, user_id: uid }))
        )
      }
    } else if (input.applies_to === 'all') {
      // Remove specific users if switching back to 'all'
      await supabase.from('assignment_rule_users').delete().eq('rule_id', ruleId)
    }

    revalidatePath('/admin/tools')
    return { data: { id: ruleId } }
  } catch (e: any) {
    return { error: e.message }
  }
}

export async function fetchAssignmentRule(toolId: string) {
  const supabase = await createClient()
  const { data: rule } = await supabase
    .from('assignment_rules')
    .select('*, users:assignment_rule_users(user_id)')
    .eq('tool_id', toolId)
    .maybeSingle()
  return rule
}

// ── Expert status ────────────────────────────────────────────────────────────

export async function toggleExpertStatus(userId: string, toolId: string): Promise<{ isExpert: boolean } | { error: string }> {
  try {
    const { supabase, user: admin } = await requireAdmin()

    const { data: existing } = await supabase
      .from('salesman_tool_expertise')
      .select('id')
      .eq('user_id', userId)
      .eq('tool_id', toolId)
      .maybeSingle()

    if (existing) {
      await supabase.from('salesman_tool_expertise').delete().eq('id', existing.id)
      return { isExpert: false }
    } else {
      await supabase.from('salesman_tool_expertise').insert({
        user_id: userId,
        tool_id: toolId,
        marked_by: admin.id,
      })
      return { isExpert: true }
    }
  } catch (e: any) {
    return { error: e.message }
  }
}

export async function fetchToolExperts(toolId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('salesman_tool_expertise')
    .select('user_id')
    .eq('tool_id', toolId)
  return (data || []).map(r => r.user_id)
}

// ── Daily auto-assignment trigger ─────────────────────────────────────────────

export async function triggerDailyAssignments(userId: string): Promise<void> {
  const sb = getServiceClient()

  // Dedup guard: try to insert today's run record
  const today = new Date().toISOString().slice(0, 10) // 'YYYY-MM-DD'
  const { error: runError } = await sb
    .from('daily_assignment_runs')
    .insert({ user_id: userId, run_date: today })
  
  // If insert fails (unique constraint), already ran today — exit
  if (runError) return

  // Fetch user's expertise (tools they're expert in — exclude from rules)
  const { data: expertRows } = await sb
    .from('salesman_tool_expertise')
    .select('tool_id')
    .eq('user_id', userId)
  const expertToolIds = new Set((expertRows || []).map((r: any) => r.tool_id))

  // Fetch all enabled rules that apply to this user
  const { data: allRules } = await sb
    .from('assignment_rules')
    .select('*, users:assignment_rule_users(user_id)')
    .eq('enabled', true)
  
  if (!allRules || allRules.length === 0) return

  const applicableRules = allRules.filter((rule: any) => {
    // Skip if user is expert for this tool
    if (expertToolIds.has(rule.tool_id)) return false
    
    if (rule.applies_to === 'all') return true
    if (rule.applies_to === 'specific') {
      return (rule.users || []).some((u: any) => u.user_id === userId)
    }
    return false
  })

  if (applicableRules.length === 0) return

  // Fetch tool details for naming
  const toolIds = applicableRules.map((r: any) => r.tool_id)
  const { data: tools } = await sb.from('tools').select('id, name').in('id', toolIds)
  const toolMap = Object.fromEntries((tools || []).map((t: any) => [t.id, t.name]))

  // Generate one assignment per rule
  for (const rule of applicableRules) {
    const toolName = toolMap[rule.tool_id] || 'Unknown Tool'
    const today_label = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    
    // Build study list
    const contentItems: { content_type: 'faq' | 'script' | 'objection'; content_id: string; content_title: string }[] = []

    if (rule.daily_faqs > 0) {
      const { data: faqs } = await sb
        .from('faqs').select('id, question')
        .is('deleted_at', null).eq('tool_id', rule.tool_id).eq('status', 'published')
        .order('priority', { ascending: false }).limit(rule.daily_faqs * 3)
      const picked = shuffle(faqs || []).slice(0, rule.daily_faqs)
      picked.forEach((f: any) => contentItems.push({ content_type: 'faq', content_id: f.id, content_title: f.question }))
    }

    if (rule.daily_scripts > 0) {
      const { data: scripts } = await sb
        .from('scripts').select('id, title')
        .is('deleted_at', null).eq('tool_id', rule.tool_id).eq('status', 'published')
        .limit(rule.daily_scripts * 3)
      const picked = shuffle(scripts || []).slice(0, rule.daily_scripts)
      picked.forEach((s: any) => contentItems.push({ content_type: 'script', content_id: s.id, content_title: s.title }))
    }

    if (rule.daily_objections > 0) {
      const { data: objections } = await sb
        .from('objections').select('id, objection_text')
        .is('deleted_at', null).eq('tool_id', rule.tool_id).eq('status', 'published')
        .limit(rule.daily_objections * 3)
      const picked = shuffle(objections || []).slice(0, rule.daily_objections)
      picked.forEach((o: any) => contentItems.push({ content_type: 'objection', content_id: o.id, content_title: o.objection_text }))
    }

    if (contentItems.length === 0) continue

    // Create the assignment (assigned to this specific user)
    const { data: assignment, error: aErr } = await sb.from('assignments').insert({
      title: `[Auto] ${toolName} Daily Study — ${today_label}`,
      instructions: `Your daily study checklist for ${toolName}. Review each item and submit your response.`,
      tool_id: rule.tool_id,
      created_by: userId, // attribute to salesman (auto-generated)
    }).select('id').single()

    if (aErr || !assignment) {
      console.error('[AutoAssign] Failed to create assignment for rule:', rule.id, aErr)
      continue
    }

    // Save content items
    if (contentItems.length > 0) {
      await sb.from('assignment_content_items').insert(
        contentItems.map(item => ({ assignment_id: assignment.id, ...item }))
      )
    }

    // Create submission stub so salesman sees it on their dashboard
    await sb.from('assignment_submissions').insert({
      assignment_id: assignment.id,
      user_id: userId,
      status: 'pending',
    }).then(({ error: sErr }: any) => {
      if (sErr) console.error('[AutoAssign] Failed to create submission stub:', sErr)
    })
  }
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}
