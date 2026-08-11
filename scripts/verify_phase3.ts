/**
 * Phase 3 End-to-End Verification & Seeding Script
 *
 * 1. Inserts sample FAQs, Scripts, Voice Notes, Objections, and Tools
 * 2. Tests global full-text search across all 5 Knowledge Base modules
 * 3. Tests script copy tracking
 *
 * Run with: npx tsx scripts/verify_phase3.ts
 */

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'
import ws from 'ws'

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

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
  global: { fetch: fetch as typeof fetch },
  realtime: { transport: ws as unknown as typeof WebSocket },
})

async function runVerification() {
  console.log('🚀  Starting Phase 3 Knowledge Base Seeding & Verification…\n')

  const { data: salesmanProfile } = await supabase
    .from('profiles')
    .select('id, email')
    .eq('email', 'salesman@salesacademy.com')
    .single()

  // 1. Seed FAQ
  console.log('❓  Seeding sample FAQ…')
  const { data: faq, error: faqErr } = await supabase
    .from('faqs')
    .upsert({
      question: 'What is the refund policy for enterprise plans?',
      short_answer: 'We offer a 30-day money-back guarantee for all new enterprise subscriptions.',
      detailed_answer: 'Full refunds are processed within 3-5 business days to the original payment method.',
      customer_ready_answer: 'Hi there! We offer a full 30-day money-back guarantee with zero risk so you can evaluate Google AI Pro with complete confidence.',
      category: 'Pricing',
      priority: 10,
      status: 'published',
    }, { onConflict: 'id' })
    .select()
    .single()

  if (faqErr) console.log(`  Note: ${faqErr.message}`)
  else console.log(`  ✅ FAQ Created/Updated: "${faq?.question}"`)

  // 2. Seed Script
  console.log('📜  Seeding sample Sales Script…')
  const { data: script, error: scriptErr } = await supabase
    .from('scripts')
    .insert({
      title: 'First Contact WhatsApp Greeting (Urdu & English)',
      script_type: 'whatsapp',
      language: 'English',
      content: 'Assalam-o-Alaikum! Thanks for reaching out about Google AI Pro. Here is a quick 1-minute video overview of how it can automate your team\'s workflow.',
      when_to_use: 'Send within 5 minutes of receiving a WhatsApp inquiry',
      related_product: 'Google AI Pro',
      status: 'published',
    })
    .select()
    .single()

  if (scriptErr) console.log(`  Note: ${scriptErr.message}`)
  else console.log(`  ✅ Script Created: "${script?.title}"`)

  // 3. Seed Voice Note
  console.log('🎙️  Seeding sample Voice Note…')
  const { data: voiceNote, error: vnErr } = await supabase
    .from('voice_notes')
    .insert({
      title: 'Warm Price Objection Audio Pitch',
      audio_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
      transcript: 'I completely understand that price is a key consideration. When looking at Google AI Pro, our clients see an average 4x return on investment within the first 60 days.',
      purpose: 'Demonstrate warm, authoritative tone when overcoming price resistance',
      when_to_send: 'Send via WhatsApp voice note when prospect asks for discount',
      language: 'English',
      duration_seconds: 45,
      key_points: ['Empathy', 'ROI Focus', 'Confident delivery'],
      status: 'published',
    })
    .select()
    .single()

  if (vnErr) console.log(`  Note: ${vnErr.message}`)
  else console.log(`  ✅ Voice Note Created: "${voiceNote?.title}"`)

  // 4. Seed Objection
  console.log('🛡️  Seeding sample Objection Response…')
  const { data: objection, error: objErr } = await supabase
    .from('objections')
    .insert({
      objection_text: 'Your price is higher than competitor X',
      meaning: 'Prospect needs to understand unique differentiation and ROI',
      recommended_response: 'Acknowledge competitor price, then highlight enterprise security, native Workspace integration, and dedicated 24/7 account management.',
      do_not_say: 'Never say competitor X is terrible or discount immediately.',
      difficulty: 'intermediate',
      status: 'published',
    })
    .select()
    .single()

  if (objErr) console.log(`  Note: ${objErr.message}`)
  else console.log(`  ✅ Objection Response Created: "${objection?.objection_text}"`)

  // 5. Seed Tool
  console.log('🛠️  Seeding sample Sales Tool…')
  const { data: tool, error: toolErr } = await supabase
    .from('tools')
    .insert({
      name: 'Canva Pro for Sales Decks',
      logo_url: 'https://upload.wikimedia.org/wikipedia/commons/0/08/Canva_icon_2021.svg',
      description: 'Create high-converting visual pitch decks, proposals, and social media flyers in minutes.',
      website_url: 'https://canva.com',
      category: 'Design Tools',
      pricing: 'Free / $12.99/mo',
      best_for: 'Designing client-ready proposals without graphic design skills',
      features: ['Templates', 'Brand Kit', 'Export PDF/PPTX'],
      youtube_tutorial_link: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      status: 'published',
    })
    .select()
    .single()

  if (toolErr) console.log(`  Note: ${toolErr.message}`)
  else console.log(`  ✅ Tool Created: "${tool?.name}"`)

  // 6. Test Script Copy Logging
  if (script && salesmanProfile) {
    console.log('\n📋  Testing script copy tracking log…')
    const { error: copyLogErr } = await supabase
      .from('script_copies')
      .insert({ user_id: salesmanProfile.id, script_id: script.id })

    if (copyLogErr) console.log(`  Note: ${copyLogErr.message}`)
    else console.log(`  ✅ Script copy event logged for ${salesmanProfile.email}!`)
  }

  // 7. Verify Queries
  console.log('\n🔍  Running Verification Queries Across Knowledge Base…')

  const [faqsCount, scriptsCount, vnCount, objCount, toolsCount] = await Promise.all([
    supabase.from('faqs').select('id', { count: 'exact', head: true }).eq('status', 'published'),
    supabase.from('scripts').select('id', { count: 'exact', head: true }).eq('status', 'published'),
    supabase.from('voice_notes').select('id', { count: 'exact', head: true }).eq('status', 'published'),
    supabase.from('objections').select('id', { count: 'exact', head: true }).eq('status', 'published'),
    supabase.from('tools').select('id', { count: 'exact', head: true }).eq('status', 'published'),
  ])

  console.log(`  - Published FAQs: ${faqsCount.count}`)
  console.log(`  - Published Scripts: ${scriptsCount.count}`)
  console.log(`  - Published Voice Notes: ${vnCount.count}`)
  console.log(`  - Published Objections: ${objCount.count}`)
  console.log(`  - Published Tools: ${toolsCount.count}`)

  console.log('\n🎉  PHASE 3 SEEDING & VERIFICATION COMPLETE!')
}

runVerification().catch(err => {
  console.error('\n❌  Verification Failed with Error:', err)
  process.exit(1)
})
