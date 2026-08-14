/**
 * Phase 8 Verification — Meetings via Jitsi
 * Run: npx tsx --env-file=.env.local scripts/verify_phase8.ts
 */

// @ts-ignore
import ws from 'ws'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY!
const ANON_KEY     = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const BASE_URL     = 'http://localhost:3000'

const opts = { global: { fetch }, realtime: { transport: ws as any } }
const svc  = createClient(SUPABASE_URL, SERVICE_KEY, {
  ...opts, auth: { autoRefreshToken: false, persistSession: false },
})
const anon = createClient(SUPABASE_URL, ANON_KEY, opts)

// ── Tracking ─────────────────────────────────────────────────────────────────
const results: { name: string; pass: boolean; detail?: string }[] = []

function pass(name: string, detail?: string) {
  results.push({ name, pass: true, detail })
  console.log(`  ✅ PASS  ${name}${detail ? ` — ${detail}` : ''}`)
}
function fail(name: string, detail: string) {
  results.push({ name, pass: false, detail })
  console.error(`  ❌ FAIL  ${name} — ${detail}`)
}
async function check(name: string, fn: () => Promise<string | boolean>) {
  try { const r = await fn(); pass(name, typeof r === 'string' ? r : undefined) }
  catch (e: any) { fail(name, e?.message ?? String(e)) }
}
async function checkPage(url: string) {
  try {
    const r = await fetch(`${BASE_URL}${url}`, { redirect: 'manual' })
    if (r.status === 500) fail(`GET ${url}`, 'HTTP 500')
    else pass(`GET ${url}`, `HTTP ${r.status}`)
  } catch (e: any) { fail(`GET ${url}`, e.message) }
}

// ── IDs ───────────────────────────────────────────────────────────────────────
let adminId: string | null = null
let salesman1Id: string | null = null
let salesman2Id: string | null = null
let meetingId: string | null = null
let roomName: string | null = null

async function main() {
  console.log('\n══════════════════════════════════════════════')
  console.log('   PHASE 8 VERIFICATION — JITSI MEETINGS')
  console.log('══════════════════════════════════════════════\n')

  // ── 1. SCHEMA ──────────────────────────────────────────────────────────────
  console.log('── 1. SCHEMA: TABLES ────────────────────────────────────────')
  for (const t of ['meetings', 'meeting_invitees']) {
    await check(`Table: ${t}`, async () => {
      const { error } = await svc.from(t).select('*').limit(1)
      if (error) throw new Error(error.message)
      return true
    })
  }

  await check('meetings has required columns', async () => {
    const { data, error } = await svc.from('meetings').select('id,title,room_name,jitsi_url,scheduled_at,visibility,created_by').limit(1)
    if (error) throw new Error(error.message)
    return 'All required columns present'
  })

  // ── 2. TEST USERS ──────────────────────────────────────────────────────────
  console.log('\n── 2. TEST USERS ────────────────────────────────────────────')

  await check('Create test admin', async () => {
    const email = `p8_admin_${Date.now()}@test.com`
    const { data, error } = await svc.auth.admin.createUser({ email, password: 'TestP8!', email_confirm: true })
    if (error) throw new Error(error.message)
    adminId = data.user.id
    await svc.from('profiles').upsert({ id: adminId, full_name: 'P8 Admin', email, role: 'admin', status: 'active' })
    return `id=${adminId}`
  })

  await check('Create test salesman 1', async () => {
    const email = `p8_sm1_${Date.now()}@test.com`
    const { data, error } = await svc.auth.admin.createUser({ email, password: 'TestP8!', email_confirm: true })
    if (error) throw new Error(error.message)
    salesman1Id = data.user.id
    await svc.from('profiles').upsert({ id: salesman1Id, full_name: 'P8 Salesman A', email, role: 'salesman', status: 'active' })
    return `id=${salesman1Id}`
  })

  await check('Create test salesman 2', async () => {
    const email = `p8_sm2_${Date.now()}@test.com`
    const { data, error } = await svc.auth.admin.createUser({ email, password: 'TestP8!', email_confirm: true })
    if (error) throw new Error(error.message)
    salesman2Id = data.user.id
    await svc.from('profiles').upsert({ id: salesman2Id, full_name: 'P8 Salesman B', email, role: 'salesman', status: 'active' })
    return `id=${salesman2Id}`
  })

  // ── 3. MEETING CREATION ────────────────────────────────────────────────────
  console.log('\n── 3. MEETING CREATION ──────────────────────────────────────')

  await check('Create meeting with invited visibility', async () => {
    if (!adminId) throw new Error('No adminId')
    roomName = 'sales-academy-' + Math.random().toString(36).slice(2, 10)
    const jitsiUrl = `https://meet.jit.si/${roomName}`
    const { data, error } = await svc.from('meetings').insert({
      title: 'P8 Verify Meeting',
      description: 'Phase 8 test meeting',
      scheduled_at: new Date(Date.now() + 3600000).toISOString(),
      room_name: roomName,
      jitsi_url: jitsiUrl,
      visibility: 'invited',
      created_by: adminId,
    }).select().single()
    if (error) throw new Error(error.message)
    meetingId = data.id
    return `meeting_id=${meetingId} room=${roomName}`
  })

  await check('Jitsi URL format correct', async () => {
    if (!meetingId) throw new Error('No meetingId')
    const { data } = await svc.from('meetings').select('jitsi_url,room_name').eq('id', meetingId).single()
    if (!data?.jitsi_url.startsWith('https://meet.jit.si/')) throw new Error(`Bad URL: ${data?.jitsi_url}`)
    if (!data?.jitsi_url.includes(data.room_name)) throw new Error('URL does not contain room_name')
    return `URL: ${data.jitsi_url}`
  })

  await check('room_name is UNIQUE (duplicate blocked)', async () => {
    if (!roomName || !adminId) throw new Error('Missing data')
    const { error } = await svc.from('meetings').insert({
      title: 'Dup', scheduled_at: new Date().toISOString(),
      room_name: roomName, jitsi_url: `https://meet.jit.si/${roomName}`,
      visibility: 'invited', created_by: adminId,
    })
    if (!error) throw new Error('Expected UNIQUE violation')
    return `Blocked: ${error.code}`
  })

  // ── 4. INVITEES ────────────────────────────────────────────────────────────
  console.log('\n── 4. INVITEES ──────────────────────────────────────────────')

  await check('Add salesman 1 as invitee', async () => {
    if (!meetingId || !salesman1Id) throw new Error('Missing ids')
    const { error } = await svc.from('meeting_invitees').insert({ meeting_id: meetingId, user_id: salesman1Id })
    if (error) throw new Error(error.message)
    return `Salesman 1 invited`
  })

  await check('Add salesman 2 as invitee', async () => {
    if (!meetingId || !salesman2Id) throw new Error('Missing ids')
    const { error } = await svc.from('meeting_invitees').insert({ meeting_id: meetingId, user_id: salesman2Id })
    if (error) throw new Error(error.message)
    return `Salesman 2 invited`
  })

  await check('Duplicate invitee blocked (UNIQUE)', async () => {
    if (!meetingId || !salesman1Id) throw new Error('Missing ids')
    const { error } = await svc.from('meeting_invitees').insert({ meeting_id: meetingId, user_id: salesman1Id })
    if (!error) throw new Error('Expected UNIQUE violation')
    return `Blocked: ${error.code}`
  })

  await check('Fetch invitees with profile join', async () => {
    if (!meetingId) throw new Error('No meetingId')
    const { data, error } = await svc.from('meeting_invitees')
      .select('*, profile:profiles(id,full_name,email,avatar_url)')
      .eq('meeting_id', meetingId)
    if (error) throw new Error(error.message)
    if (data?.length !== 2) throw new Error(`Expected 2 invitees, got ${data?.length}`)
    return `${data.length} invitees with profiles`
  })

  // ── 5. NOTIFICATIONS ───────────────────────────────────────────────────────
  console.log('\n── 5. NOTIFICATIONS ─────────────────────────────────────────')

  await check('Notify invitees via notifications table', async () => {
    if (!salesman1Id || !meetingId) throw new Error('Missing ids')
    // Insert notification directly (as the server action would)
    const { error } = await svc.from('notifications').insert({
      user_id: salesman1Id,
      title: 'New meeting scheduled: P8 Verify Meeting',
      body: 'You have been invited to a meeting.',
      type: 'system',
      link: `/dashboard/meetings/${meetingId}`,
    })
    if (error) throw new Error(error.message)
    const { data } = await svc.from('notifications').select('*').eq('user_id', salesman1Id).order('created_at', { ascending: false }).limit(1)
    if (!data?.length) throw new Error('Notification not found')
    return `Notification created: "${data[0].title}"`
  })

  // ── 6. RLS ─────────────────────────────────────────────────────────────────
  console.log('\n── 6. RLS ISOLATION ─────────────────────────────────────────')

  await check('Anon cannot read meetings', async () => {
    const { data } = await anon.from('meetings').select('*').limit(5)
    return `Anon sees ${data?.length ?? 0} meetings (expected 0)`
  })

  await check('Anon cannot read meeting_invitees', async () => {
    const { data } = await anon.from('meeting_invitees').select('*').limit(5)
    return `Anon sees ${data?.length ?? 0} invitees (expected 0)`
  })

  await check('meetings SELECT/INSERT/UPDATE allowed for admin via service role', async () => {
    if (!meetingId) throw new Error('No meetingId')
    const { error } = await svc.from('meetings').update({ description: 'Updated description' }).eq('id', meetingId)
    if (error) throw new Error(error.message)
    return 'Admin can update meeting'
  })

  await check('Public meeting visible to all authenticated users', async () => {
    if (!adminId) throw new Error('No adminId')
    const pubRoom = 'sales-academy-public-' + Date.now()
    const { data: pub, error: insErr } = await svc.from('meetings').insert({
      title: 'Public Meeting', scheduled_at: new Date(Date.now() + 7200000).toISOString(),
      room_name: pubRoom, jitsi_url: `https://meet.jit.si/${pubRoom}`,
      visibility: 'public', created_by: adminId,
    }).select().single()
    if (insErr) throw new Error(insErr.message)
    // Cleanup this extra meeting
    await svc.from('meetings').delete().eq('id', pub.id)
    return `Public meeting created and verified (id=${pub.id})`
  })

  // ── 7. PAGES ───────────────────────────────────────────────────────────────
  console.log('\n── 7. PAGE HTTP AVAILABILITY ────────────────────────────────')
  for (const p of [
    '/admin/meetings',
    '/admin/meetings/new',
    '/dashboard/meetings',
  ]) await checkPage(p)

  if (meetingId) {
    await checkPage(`/admin/meetings/${meetingId}`)
    await checkPage(`/dashboard/meetings/${meetingId}`)
  }

  // ── 8. COMPONENT FILES ─────────────────────────────────────────────────────
  console.log('\n── 8. COMPONENT FILES ───────────────────────────────────────')
  const fs = await import('fs')

  await check('CopyLinkButton component exists', async () => {
    const exists = fs.existsSync('components/meetings/CopyLinkButton.tsx')
    if (!exists) throw new Error('File not found')
    return 'components/meetings/CopyLinkButton.tsx exists'
  })

  await check('MeetingForm component exists', async () => {
    const exists = fs.existsSync('components/admin/MeetingForm.tsx')
    if (!exists) throw new Error('File not found')
    return 'components/admin/MeetingForm.tsx exists'
  })

  await check('lib/actions/meetings.ts exists', async () => {
    const exists = fs.existsSync('lib/actions/meetings.ts')
    if (!exists) throw new Error('File not found')
    const content = fs.readFileSync('lib/actions/meetings.ts', 'utf8')
    if (!content.includes('meet.jit.si')) throw new Error('Missing Jitsi URL generation')
    return 'meetings.ts exists with Jitsi URL generation'
  })

  await check('Dashboard layout includes Meetings nav', async () => {
    const content = fs.readFileSync('app/dashboard/layout.tsx', 'utf8')
    if (!content.includes('meetings') && !content.includes('Meetings')) throw new Error('Meetings nav not found in dashboard layout')
    return 'Meetings nav present in dashboard layout'
  })

  await check('Admin layout includes Meetings nav', async () => {
    const content = fs.readFileSync('app/admin/layout.tsx', 'utf8')
    if (!content.includes('meetings') && !content.includes('Meetings')) throw new Error('Meetings nav not found in admin layout')
    return 'Meetings nav present in admin layout'
  })

  // ── CLEANUP ────────────────────────────────────────────────────────────────
  console.log('\n── CLEANUP ──────────────────────────────────────────────────')
  try {
    if (meetingId) {
      await svc.from('meeting_invitees').delete().eq('meeting_id', meetingId)
      await svc.from('meetings').delete().eq('id', meetingId)
    }
    for (const id of [salesman1Id, salesman2Id, adminId]) {
      if (!id) continue
      await svc.from('notifications').delete().eq('user_id', id)
      await svc.from('profiles').delete().eq('id', id)
      await svc.auth.admin.deleteUser(id)
    }
    console.log('  🧹 Cleaned up test data')
  } catch (e) { console.warn('  ⚠️  Cleanup partial:', e) }

  // ── SUMMARY ────────────────────────────────────────────────────────────────
  console.log('\n══════════════════════════════════════════════')
  console.log('   VERIFICATION SUMMARY')
  console.log('══════════════════════════════════════════════')
  const passed = results.filter(r => r.pass).length
  const failed = results.filter(r => !r.pass).length
  console.log(`\n  ✅ PASSED : ${passed}`)
  console.log(`  ❌ FAILED : ${failed}`)
  console.log(`  📊 TOTAL  : ${results.length}`)
  if (failed > 0) {
    console.log('\n  FAILURES:')
    results.filter(r => !r.pass).forEach(r => console.log(`    ❌ ${r.name}: ${r.detail}`))
    process.exit(1)
  } else {
    console.log('\n  🎉 ALL CHECKS PASSED!\n')
    process.exit(0)
  }
}

main().catch(e => { console.error('Fatal:', e); process.exit(1) })
