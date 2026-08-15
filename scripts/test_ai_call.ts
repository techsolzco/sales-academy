/**
 * End-to-end test: calls the real Gemini API the same way ai-assist.ts does
 * Run: npx tsx --env-file=.env.local scripts/test_ai_call.ts
 */

const KEY = process.env.GEMINI_API_KEY
if (!KEY) { console.error('GEMINI_API_KEY not found in .env.local'); process.exit(1) }

const MODELS = ['gemini-flash-latest', 'gemini-3.5-flash', 'gemini-3.6-flash']

const SYSTEM_PROMPT = `[PERSONA]
You are an expert sales representative for Google AI Pro subscriptions. Warm, confident, Hinglish tone.

[LOCKED FACTS]
Single User: Rs. 499 / 18 months. Owner Account: Rs. 999 / 18 months.`

const USER_PROMPT = `A salesman is asking for help with this customer situation:
Customer says: "Yaar price thodi zyada lag rahi hai"
Provide a short WhatsApp reply they can send.`

async function main() {
  console.log('\n── End-to-end AI Call Test ──────────────────────────────')
  console.log('Key present:', KEY ? `✅ (${KEY.slice(0, 8)}...)` : '❌ missing')

  let lastError = ''
  for (const model of MODELS) {
    process.stdout.write(`\nTrying ${model}... `)
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${KEY}`
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [{ parts: [{ text: USER_PROMPT }], role: 'user' }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 200 },
      }),
    })

    if (res.status === 404 || res.status === 403) {
      const d = await res.json().catch(() => ({}))
      lastError = (d as any)?.error?.message ?? `HTTP ${res.status}`
      console.log(`❌ skipped — ${lastError.slice(0, 80)}`)
      continue
    }

    if (res.status === 429) {
      console.log('❌ rate limited (429)')
      continue
    }

    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      console.log(`❌ HTTP ${res.status}: ${JSON.stringify(d).slice(0, 100)}`)
      continue
    }

    const data = await res.json()
    const text: string = data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
    if (!text) {
      console.log('❌ empty response body')
      continue
    }

    console.log(`✅ SUCCESS\n`)
    console.log('─── AI Response ──────────────────────────────────────')
    console.log(text)
    console.log('──────────────────────────────────────────────────────')
    console.log(`\n✅ Working model: ${model}`)
    process.exit(0)
  }

  console.error('\n❌ All models failed. Last error:', lastError)
  process.exit(1)
}

main().catch(e => { console.error('Fatal:', e); process.exit(1) })
