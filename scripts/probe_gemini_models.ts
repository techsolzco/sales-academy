/**
 * Probe: List available Gemini models for this API key
 * Run: npx tsx --env-file=.env.local scripts/probe_gemini_models.ts
 */

const KEY = process.env.GEMINI_API_KEY
if (!KEY) { console.error('GEMINI_API_KEY not set in .env.local'); process.exit(1) }

async function main() {
  console.log('\n── Listing available Gemini models ──────────────────')
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models?key=${KEY}&pageSize=50`
  )
  const data = await res.json()
  if (!res.ok) {
    console.error('Error:', JSON.stringify(data, null, 2))
    process.exit(1)
  }

  const models: { name: string; displayName: string; supportedGenerationMethods?: string[] }[] = data.models ?? []
  const generateModels = models
    .filter(m => m.supportedGenerationMethods?.includes('generateContent'))
    .map(m => ({ id: m.name.replace('models/', ''), display: m.displayName }))

  console.log(`\nFound ${generateModels.length} models supporting generateContent:\n`)
  generateModels.forEach(m => console.log(`  ${m.id.padEnd(45)} — ${m.display}`))

  // Now test a quick generateContent call with gemini-2.5-flash
  console.log('\n── Testing gemini-2.5-flash ─────────────────────────')
  const testRes = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: 'Reply with just: "API working"' }], role: 'user' }],
        generationConfig: { maxOutputTokens: 20 }
      })
    }
  )
  const testData = await testRes.json()
  if (!testRes.ok) {
    console.error('  ❌ gemini-2.5-flash failed:', testRes.status, JSON.stringify(testData))
  } else {
    const text = testData.candidates?.[0]?.content?.parts?.[0]?.text
    console.log(`  ✅ gemini-2.5-flash responded: "${text?.trim()}"`)
  }
  process.exit(0)
}

main().catch(e => { console.error(e); process.exit(1) })
