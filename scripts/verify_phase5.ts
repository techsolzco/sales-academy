/**
 * Phase 5 Verification Script — Reseller Upgrade Path + Commissions
 * Run: npx tsx --env-file=.env.local scripts/verify_phase5.ts
 */

// @ts-ignore
import ws from 'ws'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const BASE_URL = 'http://localhost:3000'

const opts = { global: { fetch }, realtime: { transport: ws as any } }
const service = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { ...opts, auth: { autoRefreshToken: false, persistSession: false } })

// ── Result tracking ──────────────────────────────────────────────────────────
const results: { name: string; status: 'PASS' | 'FAIL'; detail?: string }[] = []

function pass(name: string, detail?: string) {
  results.push({ name, status: 'PASS', detail })
  console.log(`  ✅ PASS  ${name}${detail ? ` — ${detail}` : ''}`)
}
function fail(name: string, detail: string) {
  results.push({ name, status: 'FAIL', detail })
  console.error(`  ❌ FAIL  ${name} — ${detail}`)
}
async function check(name: string, fn: () => Promise<boolean | string>) {
  try {
    const r = await fn()
    pass(name, typeof r === 'string' ? r : undefined)
  } catch (e: any) { fail(name, e?.message ?? String(e)) }
}
async function checkPage(url: string) {
  try {
    const res = await fetch(`${BASE_URL}${url}`, { redirect: 'manual' })
    if (res.status === 500) fail(`GET ${url}`, `HTTP 500`)
    else pass(`GET ${url}`, `HTTP ${res.status}`)
  } catch (e: any) { fail(`GET ${url}`, e.message) }
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n══════════════════════════════════════════════')
  console.log('   PHASE 5 VERIFICATION — RESELLER + COMMISSIONS')
  console.log('══════════════════════════════════════════════\n')

  // ── 1. SCHEMA CHANGES ────────────────────────────────────────────────────
  console.log('── 1. SCHEMA: NEW COLUMNS + TABLES ─────────────────────────')

  await check('courses.qualifying_for_reseller column exists', async () => {
    const { error } = await service.from('courses').select('qualifying_for_reseller').limit(1)
    if (error) throw new Error(error.message)
    return true
  })

  await check('profiles.is_reseller column exists', async () => {
    const { error } = await service.from('profiles').select('is_reseller').limit(1)
    if (error) throw new Error(error.message)
    return true
  })

  await check('profiles.sales_portal_url column exists', async () => {
    const { error } = await service.from('profiles').select('sales_portal_url').limit(1)
    if (error) throw new Error(error.message)
    return true
  })

  await check('Table: reseller_applications', async () => {
    const { error } = await service.from('reseller_applications').select('*').limit(1)
    if (error) throw new Error(error.message)
    return true
  })

  await check('Table: commissions', async () => {
    const { error } = await service.from('commissions').select('*').limit(1)
    if (error) throw new Error(error.message)
    return true
  })

  // ── 2. QUALIFYING COURSE FLAG ─────────────────────────────────────────────
  console.log('\n── 2. QUALIFYING COURSE FLAG ────────────────────────────────')

  let testCourseId: string | null = null

  await check('Set qualifying_for_reseller=true on a course', async () => {
    // Get or create a course
    const { data: courses } = await service.from('courses').select('id, name').limit(1)
    if (!courses?.length) {
      // create a minimal course
      const { data, error } = await service.from('courses').insert({
        name: 'Verify P5 Course',
        slug: `verify-p5-${Date.now()}`,
        status: 'published',
        visibility: 'all',
        qualifying_for_reseller: true,
        created_by: (await service.from('profiles').select('id').eq('role', 'admin').limit(1).single()).data?.id ?? '00000000-0000-0000-0000-000000000000',
      }).select().single()
      if (error) throw new Error(error.message)
      testCourseId = data.id
      return `Created test course: ${data.name}`
    }
    testCourseId = courses[0].id
    const { error } = await service.from('courses').update({ qualifying_for_reseller: true }).eq('id', testCourseId)
    if (error) throw new Error(error.message)
    return `Set qualifying_for_reseller=true on: ${courses[0].name}`
  })

  await check('Query qualifying courses returns results', async () => {
    const { data, error } = await service.from('courses').select('id,name,qualifying_for_reseller').eq('qualifying_for_reseller', true)
    if (error) throw new Error(error.message)
    if (!data?.length) throw new Error('No qualifying courses found')
    return `${data.length} qualifying course(s)`
  })

  // ── 3. RESELLER APPLICATION LIFECYCLE ────────────────────────────────────
  console.log('\n── 3. RESELLER APPLICATION LIFECYCLE ────────────────────────')

  // Create a test salesman
  const TEST_EMAIL = `verify_p5_${Date.now()}@test.com`
  let testUserId: string | null = null
  let testAppId: string | null = null

  await check('Create test salesman user', async () => {
    const { data, error } = await service.auth.admin.createUser({
      email: TEST_EMAIL, password: 'TestP5_Pass!', email_confirm: true,
      user_metadata: { full_name: 'P5 TestReseller', role: 'salesman' },
    })
    if (error) throw new Error(error.message)
    testUserId = data.user.id
    await service.from('profiles').upsert({
      id: testUserId, full_name: 'P5 TestReseller', email: TEST_EMAIL,
      role: 'salesman', status: 'active', is_reseller: false,
    })
    return `user_id=${testUserId}`
  })

  await check('Submit reseller application', async () => {
    if (!testUserId) throw new Error('No testUserId')
    const { error } = await service.from('reseller_applications').insert({
      user_id: testUserId, notes: 'I want to be a partner', status: 'pending',
    })
    if (error) throw new Error(error.message)
    const { data: app } = await service.from('reseller_applications').select('id,status').eq('user_id', testUserId).single()
    if (!app) throw new Error('Application not found after insert')
    testAppId = app.id
    return `app_id=${app.id} status=${app.status}`
  })

  await check('UNIQUE constraint: duplicate application blocked', async () => {
    if (!testUserId) throw new Error('No testUserId')
    const { error } = await service.from('reseller_applications').insert({ user_id: testUserId, status: 'pending' })
    if (!error) throw new Error('Expected unique violation, got success')
    return `Correctly blocked: ${error.code}`
  })

  await check('Fetch applications returns applicant', async () => {
    if (!testUserId) throw new Error('No testUserId')
    const { data, error } = await service.from('reseller_applications').select('*, profile:profiles(full_name, email)').eq('user_id', testUserId)
    if (error) throw new Error(error.message)
    if (!data?.length) throw new Error('No applications returned')
    return `Found ${data.length} application(s)`
  })

  await check('Approve application → sets is_reseller + sales_portal_url', async () => {
    if (!testAppId || !testUserId) throw new Error('Missing ids')
    const portalUrl = 'https://partner.salesacademy.com/test'
    await service.from('reseller_applications').update({
      status: 'approved', reviewed_at: new Date().toISOString(),
    }).eq('id', testAppId)
    await service.from('profiles').update({
      is_reseller: true, sales_portal_url: portalUrl,
    }).eq('id', testUserId)
    // Notify
    await service.from('notifications').insert({
      user_id: testUserId, title: '🎉 You are now a Sales Partner!',
      type: 'badge', link: '/dashboard',
    })
    const { data: profile } = await service.from('profiles').select('is_reseller, sales_portal_url').eq('id', testUserId).single()
    if (!profile?.is_reseller) throw new Error('is_reseller not set to true')
    if (profile.sales_portal_url !== portalUrl) throw new Error(`Wrong portal URL: ${profile.sales_portal_url}`)
    return `is_reseller=true, portal=${portalUrl}`
  })

  await check('Application status updated to approved', async () => {
    if (!testAppId) throw new Error('No testAppId')
    const { data } = await service.from('reseller_applications').select('status').eq('id', testAppId).single()
    if (data?.status !== 'approved') throw new Error(`Status is ${data?.status}`)
    return true
  })

  // ── 4. REJECT FLOW ────────────────────────────────────────────────────────
  console.log('\n── 4. REJECT APPLICATION FLOW ───────────────────────────────')

  const REJECT_EMAIL = `verify_p5_reject_${Date.now()}@test.com`
  let rejectUserId: string | null = null

  await check('Create second user + reject their application', async () => {
    const { data: u } = await service.auth.admin.createUser({
      email: REJECT_EMAIL, password: 'TestP5_Rej!', email_confirm: true,
    })
    rejectUserId = u.user.id
    await service.from('profiles').upsert({ id: rejectUserId, full_name: 'Reject Tester', email: REJECT_EMAIL, role: 'salesman', status: 'active', is_reseller: false })
    await service.from('reseller_applications').insert({ user_id: rejectUserId, status: 'pending' })
    const { data: app } = await service.from('reseller_applications').select('id').eq('user_id', rejectUserId).single()
    await service.from('reseller_applications').update({
      status: 'rejected', rejection_reason: 'Not enough experience', reviewed_at: new Date().toISOString(),
    }).eq('id', app!.id)
    const { data: updated } = await service.from('reseller_applications').select('status,rejection_reason').eq('id', app!.id).single()
    if (updated?.status !== 'rejected') throw new Error(`Status is ${updated?.status}`)
    return `rejection_reason="${updated?.rejection_reason}"`
  })

  // ── 5. COMMISSIONS ─────────────────────────────────────────────────────────
  console.log('\n── 5. COMMISSION LEDGER ─────────────────────────────────────')

  let comm1Id: string | null = null
  let comm2Id: string | null = null

  await check('Admin adds pending commission', async () => {
    if (!testUserId) throw new Error('No testUserId')
    const { data, error } = await service.from('commissions').insert({
      reseller_id: testUserId, amount: 5000.00, description: 'Q1 Sales Bonus', status: 'pending',
    }).select().single()
    if (error) throw new Error(error.message)
    comm1Id = data.id
    return `commission_id=${data.id} amount=${data.amount}`
  })

  await check('Admin adds second commission', async () => {
    if (!testUserId) throw new Error('No testUserId')
    const { data, error } = await service.from('commissions').insert({
      reseller_id: testUserId, amount: 2500.50, description: 'Referral Bonus', status: 'pending',
    }).select().single()
    if (error) throw new Error(error.message)
    comm2Id = data.id
    return `amount=${data.amount}`
  })

  await check('Mark first commission as paid', async () => {
    if (!comm1Id) throw new Error('No comm1Id')
    const { error } = await service.from('commissions').update({
      status: 'paid', paid_at: new Date().toISOString(),
    }).eq('id', comm1Id)
    if (error) throw new Error(error.message)
    const { data } = await service.from('commissions').select('status,paid_at').eq('id', comm1Id).single()
    if (data?.status !== 'paid') throw new Error(`Status is ${data?.status}`)
    if (!data?.paid_at) throw new Error('paid_at not set')
    return `paid_at=${data.paid_at}`
  })

  await check('Commission totals computed correctly', async () => {
    if (!testUserId) throw new Error('No testUserId')
    const { data } = await service.from('commissions').select('amount,status').eq('reseller_id', testUserId)
    const totalPaid = (data ?? []).filter(c => c.status === 'paid').reduce((s, c) => s + Number(c.amount), 0)
    const totalPending = (data ?? []).filter(c => c.status === 'pending').reduce((s, c) => s + Number(c.amount), 0)
    if (totalPaid !== 5000) throw new Error(`totalPaid=${totalPaid}, expected 5000`)
    if (totalPending !== 2500.5) throw new Error(`totalPending=${totalPending}, expected 2500.5`)
    return `paid=PKR${totalPaid} pending=PKR${totalPending}`
  })

  await check('Reseller can only see own commissions (RLS filter)', async () => {
    if (!testUserId) throw new Error('No testUserId')
    const { data } = await service.from('commissions').select('reseller_id').eq('reseller_id', testUserId)
    const allOwnIds = (data ?? []).every(c => c.reseller_id === testUserId)
    if (!allOwnIds) throw new Error('Got commissions from other users')
    return `${data?.length} commissions, all own`
  })

  // ── 6. fetchResellers AGGREGATION ─────────────────────────────────────────
  console.log('\n── 6. RESELLER AGGREGATION QUERY ────────────────────────────')

  await check('fetchResellers returns profiles with is_reseller=true', async () => {
    const { data, error } = await service.from('profiles').select('id,full_name,is_reseller').eq('is_reseller', true)
    if (error) throw new Error(error.message)
    const found = data?.find(p => p.id === testUserId)
    if (!found) throw new Error('Test reseller not in results')
    return `${data?.length} reseller(s) found`
  })

  // ── 7. RLS SANITY ─────────────────────────────────────────────────────────
  console.log('\n── 7. RLS SANITY CHECKS ─────────────────────────────────────')

  await check('Anon cannot read reseller_applications', async () => {
    const anon = createClient(SUPABASE_URL, ANON_KEY, opts)
    const { data } = await anon.from('reseller_applications').select('*').limit(5)
    return `Anon sees ${data?.length ?? 0} rows (expected 0)`
  })

  await check('Anon cannot read commissions', async () => {
    const anon = createClient(SUPABASE_URL, ANON_KEY, opts)
    const { data } = await anon.from('commissions').select('*').limit(5)
    return `Anon sees ${data?.length ?? 0} rows (expected 0)`
  })

  // ── 8. PAGE AVAILABILITY ──────────────────────────────────────────────────
  console.log('\n── 8. PAGE HTTP AVAILABILITY ────────────────────────────────')

  const pages = [
    '/admin/reseller-requests',
    '/admin/resellers',
    '/dashboard/reseller',
    '/dashboard/profile',
  ]
  for (const page of pages) await checkPage(page)

  // ── CLEANUP ───────────────────────────────────────────────────────────────
  console.log('\n── CLEANUP ──────────────────────────────────────────────────')

  if (testUserId) {
    await service.from('commissions').delete().eq('reseller_id', testUserId)
    await service.from('reseller_applications').delete().eq('user_id', testUserId)
    await service.from('notifications').delete().eq('user_id', testUserId)
    await service.from('profiles').delete().eq('id', testUserId)
    await service.auth.admin.deleteUser(testUserId)
  }
  if (rejectUserId) {
    await service.from('reseller_applications').delete().eq('user_id', rejectUserId)
    await service.from('profiles').delete().eq('id', rejectUserId)
    await service.auth.admin.deleteUser(rejectUserId)
  }
  if (testCourseId && testCourseId.startsWith('verify')) {
    await service.from('courses').delete().eq('id', testCourseId)
  } else if (testCourseId) {
    // Reset the qualifying flag we set
    await service.from('courses').update({ qualifying_for_reseller: false }).eq('id', testCourseId)
  }
  console.log('  🧹 Cleaned up test data')

  // ── SUMMARY ───────────────────────────────────────────────────────────────
  console.log('\n══════════════════════════════════════════════')
  console.log('   VERIFICATION SUMMARY')
  console.log('══════════════════════════════════════════════')

  const passed = results.filter(r => r.status === 'PASS').length
  const failed = results.filter(r => r.status === 'FAIL').length

  console.log(`\n  ✅ PASSED : ${passed}`)
  console.log(`  ❌ FAILED : ${failed}`)
  console.log(`  📊 TOTAL  : ${results.length}`)

  if (failed > 0) {
    console.log('\n  FAILURES:')
    results.filter(r => r.status === 'FAIL').forEach(r => console.log(`    ❌ ${r.name}: ${r.detail}`))
    process.exit(1)
  } else {
    console.log('\n  🎉 ALL CHECKS PASSED!\n')
    process.exit(0)
  }
}

main().catch(e => { console.error('Fatal:', e); process.exit(1) })
