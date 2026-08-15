/**
 * Test which Gemini models work with this API key
 * Run: npx tsx --env-file=.env.local scripts/test_gemini_models.ts
 */
const KEY = process.env.GEMINI_API_KEY
if (!KEY) { console.error('GEMINI_API_KEY not found'); process.exit(1) }

const CANDIDATES = [
  'gemini-flash-latest',
  'gemini-2.5-flash-lite',
  'gemini-3.5-flash',
  'gemini-3.6-flash',
  'gemini-3.7-flash',
]

async function test(model: string) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: 'Reply with exactly: WORKING' }], role: 'user' }],
        generationConfig: { maxOutputTokens: 20, temperature: 0 }
      })
    }
  )
  const d = await res.json()
  if (res.ok) {
    const text = d.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? '(no text)'
    return { ok: true, text }
  }
  return { ok: false, text: d.error?.message?.slice(0, 100) ?? `HTTP ${res.status}` }
}

;(async () => {
  console.log('\n── Gemini Model Test ─────────────────────────────────')
  for (const model of CANDIDATES) {
    const result = await test(model)
    console.log(`  ${result.ok ? '✅' : '❌'} ${model.padEnd(30)} ${result.text}`)
  }
  console.log()
  process.exit(0)
})()
