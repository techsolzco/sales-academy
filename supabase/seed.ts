/**
 * Seed Script — Sales Academy
 *
 * Creates:
 *  1. One admin user: admin@salesacademy.com / Admin@1234!
 *  2. One salesman user: salesman@salesacademy.com / Sales@1234!
 *
 * Run:
 *   npm run seed
 *
 * ⚠️  Uses the SERVICE ROLE KEY — never expose this in the browser.
 *     Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
 *     to be set in .env.local
 */

// Load env vars from .env.local before anything else
import { config } from 'node:process'
import { createClient } from '@supabase/supabase-js'
import ws from 'ws'

// Manual dotenv load for tsx scripts (no dotenv package needed)
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

function loadEnv() {
  try {
    const raw = readFileSync(resolve(process.cwd(), '.env.local'), 'utf-8')
    for (const line of raw.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const eq = trimmed.indexOf('=')
      if (eq === -1) continue
      const key = trimmed.slice(0, eq).trim()
      const value = trimmed.slice(eq + 1).trim()
      if (!process.env[key]) process.env[key] = value
    }
  } catch {
    console.error('Could not load .env.local — set env vars manually.')
  }
}

loadEnv()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌  Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

// Admin client — bypasses RLS for seeding
const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
  // Node.js 20 has no native WebSocket — supply the `ws` package as transport
  global: { fetch: fetch as typeof fetch },
  realtime: { transport: ws as unknown as typeof WebSocket },
})

const SEED_USERS = [
  {
    email: 'admin@salesacademy.com',
    password: 'Admin@1234!',
    full_name: 'Academy Admin',
    role: 'admin' as const,
  },
  {
    email: 'salesman@salesacademy.com',
    password: 'Sales@1234!',
    full_name: 'Test Salesman',
    role: 'salesman' as const,
  },
]

async function seed() {
  console.log('🌱  Starting seed…\n')

  for (const user of SEED_USERS) {
    console.log(`  Creating user: ${user.email} (${user.role})`)

    // Create the auth user — Supabase handles bcrypt hashing automatically.
    // Passwords are NEVER stored in plaintext.
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: user.email,
      password: user.password,
      email_confirm: true,   // Skip email confirmation for seed users
      user_metadata: {
        full_name: user.full_name,
        role: user.role,
      },
    })

    if (authError) {
      if (authError.message.includes('already been registered')) {
        console.log(`    ⚠️  User already exists, skipping.`)
        continue
      }
      console.error(`    ❌  Auth error: ${authError.message}`)
      continue
    }

    const userId = authData.user.id

    // Upsert the profile row (the DB trigger handles creation,
    // but we upsert to be idempotent).
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: userId,
        full_name: user.full_name,
        email: user.email,
        role: user.role,
        status: 'active',
      })

    if (profileError) {
      console.error(`    ❌  Profile error: ${profileError.message}`)
      continue
    }

    console.log(`    ✅  Created successfully (id: ${userId})`)
  }

  console.log('\n🎉  Seed complete!')
  console.log('\nTest credentials:')
  console.log('  Admin:    admin@salesacademy.com    /  Admin@1234!')
  console.log('  Salesman: salesman@salesacademy.com /  Sales@1234!')
}

seed().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
