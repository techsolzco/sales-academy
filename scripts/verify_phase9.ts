/**
 * Phase 9 Verification — Theming & Polish
 * Run: npx tsx --env-file=.env.local scripts/verify_phase9.ts
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

async function main() {
  console.log('\n══════════════════════════════════════════════')
  console.log('   PHASE 9 VERIFICATION — THEMING & POLISH')
  console.log('══════════════════════════════════════════════\n')

  // ── 1. SCHEMA ──────────────────────────────────────────────────────────────
  console.log('── 1. SCHEMA: TABLES ────────────────────────────────────────')
  await check(`Table: theme_settings exists`, async () => {
    const { error } = await svc.from('theme_settings').select('*').limit(1)
    if (error) throw new Error(error.message)
    return true
  })

  await check('theme_settings has required columns', async () => {
    const { data, error } = await svc.from('theme_settings').select('id,portal,primary_color,accent_color,theme_mode').limit(1)
    if (error) throw new Error(error.message)
    return 'All required columns present'
  })

  await check('Default themes pre-seeded', async () => {
    const { data, error } = await svc.from('theme_settings').select('*')
    if (error) throw new Error(error.message)
    if (!data || data.length < 2) throw new Error(`Found ${data?.length} themes, expected at least 2`)
    const admin = data.find(d => d.portal === 'admin')
    const salesman = data.find(d => d.portal === 'salesman')
    if (!admin) throw new Error('Missing admin theme')
    if (!salesman) throw new Error('Missing salesman theme')
    return `Admin & Salesman defaults found`
  })

  // ── 2. RLS ─────────────────────────────────────────────────────────────────
  console.log('\n── 2. RLS ISOLATION ─────────────────────────────────────────')

  await check('Anon can read theme_settings', async () => {
    const { data, error } = await anon.from('theme_settings').select('*')
    if (error) throw new Error(error.message)
    if (!data || data.length === 0) throw new Error('Anon cannot see themes')
    return `Anon sees ${data.length} themes`
  })

  // ── 3. COMPONENTS ──────────────────────────────────────────────────────────
  console.log('\n── 3. COMPONENT FILES ───────────────────────────────────────')
  const fs = await import('fs')

  await check('ThemeInjector component exists', async () => {
    if (!fs.existsSync('components/layout/ThemeInjector.tsx')) throw new Error('File not found')
    return true
  })

  await check('EmptyState component exists', async () => {
    if (!fs.existsSync('components/ui/EmptyState.tsx')) throw new Error('File not found')
    return true
  })

  await check('Loading states exist', async () => {
    if (!fs.existsSync('app/admin/loading.tsx')) throw new Error('Admin loading missing')
    if (!fs.existsSync('app/dashboard/loading.tsx')) throw new Error('Dashboard loading missing')
    return 'loading.tsx files present'
  })

  // ── 4. PAGES ───────────────────────────────────────────────────────────────
  console.log('\n── 4. PAGE HTTP AVAILABILITY ────────────────────────────────')
  for (const p of [
    '/admin/settings/appearance',
  ]) await checkPage(p)

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
