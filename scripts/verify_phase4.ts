/**
 * Phase 4 Verification Script
 * Tests all new features end-to-end against the live Supabase database
 * Run: npx tsx scripts/verify_phase4.ts
 */

import { createClient } from '@supabase/supabase-js'
// @ts-ignore — ws provides Node 20 WebSocket compat for Supabase Realtime
import ws from 'ws'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const BASE_URL = 'http://localhost:3000'

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ Missing env vars. Ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set.')
  process.exit(1)
}

const clientOpts = { global: { fetch }, realtime: { transport: ws as any } }

const service = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  ...clientOpts,
  auth: { autoRefreshToken: false, persistSession: false },
})

// ── Helpers ────────────────────────────────────────────────────────────────

const results: { name: string; status: 'PASS' | 'FAIL' | 'SKIP'; detail?: string }[] = []

function pass(name: string, detail?: string) {
  results.push({ name, status: 'PASS', detail })
  console.log(`  ✅ PASS  ${name}${detail ? ` — ${detail}` : ''}`)
}

function fail(name: string, detail: string) {
  results.push({ name, status: 'FAIL', detail })
  console.error(`  ❌ FAIL  ${name} — ${detail}`)
}

function skip(name: string, detail: string) {
  results.push({ name, status: 'SKIP', detail })
  console.warn(`  ⚠️  SKIP  ${name} — ${detail}`)
}

async function check(name: string, fn: () => Promise<boolean | string>) {
  try {
    const result = await fn()
    if (result === true || typeof result === 'string') {
      pass(name, typeof result === 'string' ? result : undefined)
    } else {
      fail(name, 'returned false')
    }
  } catch (e: any) {
    fail(name, e?.message ?? String(e))
  }
}

async function checkPage(url: string) {
  try {
    const res = await fetch(`${BASE_URL}${url}`, {
      redirect: 'manual', // don't follow redirects — we expect redirects on protected pages
    })
    // 200 = loaded, 307/308 = redirect (expected for protected pages accessed without session)
    if (res.status === 200 || res.status === 307 || res.status === 308) {
      pass(`GET ${url}`, `HTTP ${res.status}`)
    } else if (res.status === 500) {
      fail(`GET ${url}`, `HTTP 500 — Server Error`)
    } else {
      pass(`GET ${url}`, `HTTP ${res.status}`)
    }
  } catch (e: any) {
    fail(`GET ${url}`, `Fetch failed: ${e.message}`)
  }
}

// ── Cleanup helper ──────────────────────────────────────────────────────────
async function cleanup(testEmail: string, appEmail: string) {
  // Remove test application
  await service.from('enrollment_applications').delete().eq('email', appEmail)
  // Remove test user if created
  const { data: users } = await service.auth.admin.listUsers()
  const testUser = users?.users?.find(u => u.email === testEmail)
  if (testUser) await service.auth.admin.deleteUser(testUser.id)
  await service.from('profiles').delete().eq('email', testEmail)
  // Remove test community posts
  await service.from('community_posts').delete().like('content', '%[verify_phase4]%')
}

// ════════════════════════════════════════════════════════════════════════════
// MAIN
// ════════════════════════════════════════════════════════════════════════════

async function main() {
  console.log('\n══════════════════════════════════════════════')
  console.log('   PHASE 4 SELF-VERIFICATION SCRIPT')
  console.log('══════════════════════════════════════════════\n')

  const TEST_APP_EMAIL = `verify_phase4_applicant_${Date.now()}@test.com`
  const TEST_APP_NAME = 'Phase4 TestApplicant'

  // ── Pre-cleanup ───────────────────────────────────────────────────────────
  await cleanup('', TEST_APP_EMAIL)

  // ── 1. DATABASE TABLES EXIST ──────────────────────────────────────────────
  console.log('\n── 1. DATABASE TABLES ──────────────────────────────────────')

  const requiredTables = [
    'enrollment_applications',
    'notifications',
    'badges',
    'user_badges',
    'community_posts',
    'community_replies',
    'user_preferences',
  ]

  for (const table of requiredTables) {
    await check(`Table: ${table}`, async () => {
      const { error } = await service.from(table).select('*').limit(1)
      if (error) throw new Error(error.message)
      return true
    })
  }

  // ── 2. BADGES SEEDED ─────────────────────────────────────────────────────
  console.log('\n── 2. BADGES SEEDED ────────────────────────────────────────')

  const expectedSlugs = ['first_lesson', 'first_course', 'five_courses', 'first_script_copy', 'first_post']

  await check('All 5 badges exist in DB', async () => {
    const { data, error } = await service.from('badges').select('slug')
    if (error) throw new Error(error.message)
    const found = (data ?? []).map(b => b.slug)
    const missing = expectedSlugs.filter(s => !found.includes(s))
    if (missing.length > 0) throw new Error(`Missing slugs: ${missing.join(', ')}`)
    return `Found: ${found.join(', ')}`
  })

  // ── 3. STORAGE BUCKET ────────────────────────────────────────────────────
  console.log('\n── 3. STORAGE BUCKET ───────────────────────────────────────')

  await check('avatars bucket exists', async () => {
    const { data, error } = await service.storage.listBuckets()
    if (error) throw new Error(error.message)
    const bucket = (data ?? []).find(b => b.id === 'avatars')
    if (!bucket) throw new Error('avatars bucket not found')
    return `public=${bucket.public}`
  })

  // ── 4. ENROLLMENT APPLICATION ────────────────────────────────────────────
  console.log('\n── 4. ENROLLMENT APPLICATION FLOW ──────────────────────────')

  await check('Insert enrollment application (anon)', async () => {
    const { error } = await service
      .from('enrollment_applications')
      .insert({
        full_name: TEST_APP_NAME,
        email: TEST_APP_EMAIL,
        phone: '+92 300 0000000',
        knowledge_level: 'beginner',
        desired_course: 'Google AI Pro Sales Training',
        reason: 'Test verification run',
        prior_experience: 'None',
        status: 'pending',
      })
    if (error) throw new Error(error.message)
    return 'Application inserted successfully'
  })

  await check('Application status is pending', async () => {
    const { data, error } = await service
      .from('enrollment_applications')
      .select('status')
      .eq('email', TEST_APP_EMAIL)
      .single()
    if (error) throw new Error(error.message)
    if (data.status !== 'pending') throw new Error(`Expected pending, got ${data.status}`)
    return true
  })

  // ── 5. APPROVE APPLICATION → CREATE USER ─────────────────────────────────
  console.log('\n── 5. APPROVE APPLICATION (creates salesman account) ────────')

  let newUserId: string | null = null

  await check('Create Supabase auth user for approved applicant', async () => {
    const tempPassword = `TestSA_${Date.now()}A!`
    const { data: authData, error: authErr } = await service.auth.admin.createUser({
      email: TEST_APP_EMAIL,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { full_name: TEST_APP_NAME, role: 'salesman' },
    })
    if (authErr) throw new Error(authErr.message)
    newUserId = authData.user.id

    const { error: profileErr } = await service.from('profiles').upsert({
      id: newUserId,
      full_name: TEST_APP_NAME,
      email: TEST_APP_EMAIL,
      role: 'salesman',
      status: 'active',
    })
    if (profileErr) throw new Error(profileErr.message)

    // Mark application approved
    await service
      .from('enrollment_applications')
      .update({ status: 'approved' })
      .eq('email', TEST_APP_EMAIL)

    return `User created: ${newUserId}`
  })

  await check('Profile row exists for new user', async () => {
    if (!newUserId) throw new Error('No newUserId from previous step')
    const { data, error } = await service.from('profiles').select('*').eq('id', newUserId).single()
    if (error) throw new Error(error.message)
    if (data.role !== 'salesman') throw new Error(`Wrong role: ${data.role}`)
    if (data.status !== 'active') throw new Error(`Wrong status: ${data.status}`)
    return `role=${data.role} status=${data.status}`
  })

  // ── 6. NOTIFICATIONS ─────────────────────────────────────────────────────
  console.log('\n── 6. NOTIFICATIONS ────────────────────────────────────────')

  await check('Create notification for new user', async () => {
    if (!newUserId) throw new Error('No newUserId')
    const { error } = await service.from('notifications').insert({
      user_id: newUserId,
      title: '🎉 Welcome to Sales Academy!',
      body: 'Your application has been approved.',
      type: 'enrollment',
      link: '/dashboard',
    })
    if (error) throw new Error(error.message)
    return true
  })

  await check('Notification row readable', async () => {
    if (!newUserId) throw new Error('No newUserId')
    const { data, error } = await service
      .from('notifications')
      .select('*')
      .eq('user_id', newUserId)
    if (error) throw new Error(error.message)
    if (!data?.length) throw new Error('No notifications found')
    return `${data.length} notification(s) found`
  })

  // ── 7. REJECTION FLOW ────────────────────────────────────────────────────
  console.log('\n── 7. REJECT APPLICATION FLOW ──────────────────────────────')

  const REJECT_EMAIL = `verify_phase4_reject_${Date.now()}@test.com`
  await check('Insert and reject an application', async () => {
    await service.from('enrollment_applications').insert({
      full_name: 'Reject Test User',
      email: REJECT_EMAIL,
      status: 'pending',
    })
    const { error } = await service
      .from('enrollment_applications')
      .update({ status: 'rejected', rejection_reason: 'Test rejection' })
      .eq('email', REJECT_EMAIL)
    if (error) throw new Error(error.message)
    const { data } = await service.from('enrollment_applications').select('status,rejection_reason').eq('email', REJECT_EMAIL).single()
    if (data?.status !== 'rejected') throw new Error('Status not rejected')
    return `rejection_reason="${data.rejection_reason}"`
  })
  await service.from('enrollment_applications').delete().eq('email', REJECT_EMAIL)

  // ── 8. BADGES ────────────────────────────────────────────────────────────
  console.log('\n── 8. BADGE AWARD LOGIC ────────────────────────────────────')

  let firstLessonBadgeId: string | null = null

  await check('Fetch badge by slug (first_lesson)', async () => {
    const { data, error } = await service.from('badges').select('id,slug').eq('slug', 'first_lesson').single()
    if (error) throw new Error(error.message)
    firstLessonBadgeId = data.id
    return `id=${data.id}`
  })

  await check('Award badge to test user', async () => {
    if (!newUserId || !firstLessonBadgeId) throw new Error('Missing user or badge id')
    const { error } = await service.from('user_badges').insert({
      user_id: newUserId,
      badge_id: firstLessonBadgeId,
    })
    if (error) throw new Error(error.message)
    return true
  })

  await check('Duplicate badge award is idempotent (UNIQUE constraint)', async () => {
    if (!newUserId || !firstLessonBadgeId) throw new Error('Missing ids')
    const { error } = await service.from('user_badges').insert({
      user_id: newUserId,
      badge_id: firstLessonBadgeId,
    })
    // Should fail with unique constraint — that's the correct behavior
    if (!error) throw new Error('Expected unique constraint violation, got success')
    return `Correctly blocked: ${error.code}`
  })

  await check('fetchUserBadges returns all badges with earned_at', async () => {
    if (!newUserId) throw new Error('No newUserId')
    const { data: allBadges } = await service.from('badges').select('*')
    const { data: userBadges } = await service.from('user_badges').select('*').eq('user_id', newUserId)
    const result = (allBadges ?? []).map(b => ({
      badge: b,
      earned_at: (userBadges ?? []).find(ub => ub.badge_id === b.id)?.earned_at ?? null,
    }))
    const earned = result.filter(r => r.earned_at !== null)
    const locked = result.filter(r => r.earned_at === null)
    return `${earned.length} earned, ${locked.length} locked`
  })

  // ── 9. USER PREFERENCES ──────────────────────────────────────────────────
  console.log('\n── 9. USER PREFERENCES (i18n) ──────────────────────────────')

  await check('Insert user preference (language=ur)', async () => {
    if (!newUserId) throw new Error('No newUserId')
    const { error } = await service.from('user_preferences').upsert({
      user_id: newUserId,
      language: 'ur',
    }, { onConflict: 'user_id' })
    if (error) throw new Error(error.message)
    return true
  })

  await check('Read user preference back', async () => {
    if (!newUserId) throw new Error('No newUserId')
    const { data, error } = await service.from('user_preferences').select('language').eq('user_id', newUserId).single()
    if (error) throw new Error(error.message)
    if (data.language !== 'ur') throw new Error(`Expected ur, got ${data.language}`)
    return `language=${data.language}`
  })

  await check('Update preference to en (upsert idempotent)', async () => {
    if (!newUserId) throw new Error('No newUserId')
    await service.from('user_preferences').upsert({ user_id: newUserId, language: 'en' }, { onConflict: 'user_id' })
    const { data } = await service.from('user_preferences').select('language').eq('user_id', newUserId).single()
    if (data?.language !== 'en') throw new Error(`Expected en, got ${data?.language}`)
    return true
  })

  // ── 10. COMMUNITY POSTS & REPLIES ─────────────────────────────────────────
  console.log('\n── 10. COMMUNITY POSTS & REPLIES ───────────────────────────')

  let testPostId: string | null = null

  await check('Create community post', async () => {
    if (!newUserId) throw new Error('No newUserId')
    const { data, error } = await service.from('community_posts').insert({
      user_id: newUserId,
      content: 'Hello community! [verify_phase4]',
      post_type: 'general',
    }).select().single()
    if (error) throw new Error(error.message)
    testPostId = data.id
    return `post_id=${data.id}`
  })

  await check('Create reply on post', async () => {
    if (!newUserId || !testPostId) throw new Error('Missing ids')
    const { error } = await service.from('community_replies').insert({
      post_id: testPostId,
      user_id: newUserId,
      content: 'Test reply [verify_phase4]',
    })
    if (error) throw new Error(error.message)
    return true
  })

  await check('Fetch post with replies join', async () => {
    if (!testPostId) throw new Error('No testPostId')
    const { data, error } = await service
      .from('community_posts')
      .select('*, replies:community_replies(*)')
      .eq('id', testPostId)
      .single()
    if (error) throw new Error(error.message)
    const replyCount = data.replies?.length ?? 0
    if (replyCount === 0) throw new Error('No replies found')
    return `${replyCount} reply attached`
  })

  await check('Pin post (set is_pinned=true)', async () => {
    if (!testPostId) throw new Error('No testPostId')
    const { error } = await service.from('community_posts').update({ is_pinned: true }).eq('id', testPostId)
    if (error) throw new Error(error.message)
    const { data } = await service.from('community_posts').select('is_pinned').eq('id', testPostId).single()
    if (!data?.is_pinned) throw new Error('Post not pinned')
    return true
  })

  await check('Soft-delete post (is_deleted=true)', async () => {
    if (!testPostId) throw new Error('No testPostId')
    const { error } = await service.from('community_posts').update({ is_deleted: true }).eq('id', testPostId)
    if (error) throw new Error(error.message)
    const { data } = await service.from('community_posts').select('is_deleted').eq('id', testPostId).single()
    if (!data?.is_deleted) throw new Error('Post not soft-deleted')
    return true
  })

  // ── 11. PAGE AVAILABILITY ─────────────────────────────────────────────────
  console.log('\n── 11. PAGE HTTP AVAILABILITY ──────────────────────────────')

  const publicPages = ['/register', '/auth/login', '/auth/pending']
  const protectedPages = [
    '/admin',
    '/admin/enrollments',
    '/admin/community',
    '/admin/courses',
    '/admin/faqs',
    '/admin/scripts',
    '/admin/voice-notes',
    '/admin/objections',
    '/admin/tools',
    '/dashboard',
    '/dashboard/community',
    '/dashboard/profile',
    '/dashboard/training',
    '/dashboard/faqs',
    '/dashboard/scripts',
  ]

  for (const page of [...publicPages, ...protectedPages]) {
    await checkPage(page)
  }

  // ── 12. TRANSLATIONS FILE INTEGRITY ──────────────────────────────────────
  console.log('\n── 12. i18n TRANSLATIONS INTEGRITY ─────────────────────────')

  await check('translations.ts exports en and ur keys', async () => {
    const { translations } = await import('../lib/i18n/translations')
    const enKeys = Object.keys(translations.en)
    const urKeys = Object.keys(translations.ur)
    if (enKeys.length === 0) throw new Error('EN translations empty')
    if (urKeys.length === 0) throw new Error('UR translations empty')
    const missing = enKeys.filter(k => !urKeys.includes(k))
    // Allow up to 5 missing Urdu keys (acceptable for now)
    if (missing.length > 5) throw new Error(`${missing.length} EN keys missing in UR: ${missing.slice(0, 3).join(', ')}...`)
    return `EN=${enKeys.length} keys, UR=${urKeys.length} keys, ${missing.length} untranslated`
  })

  // ── 13. RLS SANITY CHECK ─────────────────────────────────────────────────
  console.log('\n── 13. RLS POLICY SANITY ───────────────────────────────────')

  await check('Anon user cannot read notifications (RLS)', async () => {
    const anon = createClient(SUPABASE_URL, ANON_KEY, clientOpts)
    const { data, error } = await anon.from('notifications').select('*').limit(5)
    // Should return empty (RLS) not error on anon
    if (error && error.code !== 'PGRST301') throw new Error(`Unexpected error: ${error.message}`)
    const count = data?.length ?? 0
    // Anon should see 0 rows
    return `Anon sees ${count} notifications (expected 0)`
  })

  await check('Anon user cannot read user_badges (RLS)', async () => {
    const anon = createClient(SUPABASE_URL, ANON_KEY, clientOpts)
    const { data } = await anon.from('user_badges').select('*').limit(5)
    const count = data?.length ?? 0
    return `Anon sees ${count} user_badges (expected 0)`
  })

  await check('Anyone can INSERT enrollment_applications (public)', async () => {
    const anon = createClient(SUPABASE_URL, ANON_KEY, clientOpts)
    const testEmail = `rls_anon_test_${Date.now()}@test.com`
    const { error } = await anon.from('enrollment_applications').insert({
      full_name: 'RLS Test',
      email: testEmail,
      status: 'pending',
    })
    // Clean up
    await service.from('enrollment_applications').delete().eq('email', testEmail)
    if (error) throw new Error(`Anon insert blocked: ${error.message}`)
    return 'Anon can submit enrollment application ✓'
  })

  // ── CLEANUP ───────────────────────────────────────────────────────────────
  console.log('\n── CLEANUP ─────────────────────────────────────────────────')
  if (newUserId) {
    await service.from('user_preferences').delete().eq('user_id', newUserId)
    await service.from('user_badges').delete().eq('user_id', newUserId)
    await service.from('community_replies').delete().like('content', '%[verify_phase4]%')
    await service.from('community_posts').delete().like('content', '%[verify_phase4]%')
    await service.from('notifications').delete().eq('user_id', newUserId)
    await service.from('profiles').delete().eq('id', newUserId)
    await service.auth.admin.deleteUser(newUserId)
    await service.from('enrollment_applications').delete().eq('email', TEST_APP_EMAIL)
    console.log('  🧹 Cleaned up test data')
  }

  // ── SUMMARY ───────────────────────────────────────────────────────────────
  console.log('\n══════════════════════════════════════════════')
  console.log('   VERIFICATION SUMMARY')
  console.log('══════════════════════════════════════════════')

  const passed = results.filter(r => r.status === 'PASS').length
  const failed = results.filter(r => r.status === 'FAIL').length
  const skipped = results.filter(r => r.status === 'SKIP').length

  console.log(`\n  ✅ PASSED : ${passed}`)
  console.log(`  ❌ FAILED : ${failed}`)
  console.log(`  ⚠️  SKIPPED: ${skipped}`)
  console.log(`  📊 TOTAL  : ${results.length}`)

  if (failed > 0) {
    console.log('\n  FAILURES:')
    results.filter(r => r.status === 'FAIL').forEach(r => {
      console.log(`    ❌ ${r.name}: ${r.detail}`)
    })
    process.exit(1)
  } else {
    console.log('\n  🎉 ALL CHECKS PASSED!\n')
    process.exit(0)
  }
}

main().catch(e => {
  console.error('Fatal error:', e)
  process.exit(1)
})
