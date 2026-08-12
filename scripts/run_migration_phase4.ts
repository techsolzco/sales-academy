/**
 * Direct migration runner using Supabase's internal pg REST API
 * Uses service_role key which has full DB access
 */

import { readFileSync } from 'fs'
import { join } from 'path'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

async function executeSql(sql: string) {
  // Supabase exposes a direct SQL execution endpoint via the pg REST API
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: sql }),
  })
  
  if (!res.ok) {
    const text = await res.text()
    return { ok: false, error: text, status: res.status }
  }
  
  return { ok: true, status: res.status }
}

async function main() {
  console.log('\n══════════════════════════════════════════════')
  console.log('   PHASE 4 MIGRATION — DIRECT RUNNER')
  console.log('══════════════════════════════════════════════\n')

  // Read migration file
  const migrationPath = join(process.cwd(), 'supabase', 'migrations', '004_phase4.sql')
  const sql = readFileSync(migrationPath, 'utf-8')
  
  // Check if already applied by looking for the badges table
  const checkRes = await fetch(
    `${SUPABASE_URL}/rest/v1/badges?select=slug&limit=1`,
    {
      headers: {
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      },
    }
  )
  
  if (checkRes.status === 200) {
    const data = await checkRes.json()
    console.log('✅ Migration already applied! badges table exists.')
    console.log(`   Found ${data.length} badge(s):`, data.map((b: any) => b.slug))
    process.exit(0)
  }
  
  console.log('📋 Tables not found. Migration needs to be run.\n')
  console.log('════════════════════════════════════════════════════════')
  console.log('  ACTION REQUIRED: Run this SQL in your Supabase dashboard')
  console.log('════════════════════════════════════════════════════════\n')
  console.log('  🔗 Direct link:')
  console.log(`     https://supabase.com/dashboard/project/musnmhafbxxvnhjchyta/sql/new\n`)
  console.log('  📄 SQL File location:')
  console.log(`     ${migrationPath}\n`)
  console.log('  Or copy-paste this SQL:\n')
  console.log('─'.repeat(60))
  console.log(sql)
  console.log('─'.repeat(60))
  
  process.exit(2)
}

main().catch(e => {
  console.error('Fatal:', e)
  process.exit(1)
})
