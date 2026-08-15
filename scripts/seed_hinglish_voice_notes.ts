/**
 * Seed: 4 Hinglish Voice Notes (Roman Urdu / WhatsApp style)
 * Uses direct REST calls to avoid Node 20 WebSocket issue with @supabase/supabase-js.
 * Run: npx tsx --env-file=.env.local scripts/seed_hinglish_voice_notes.ts
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY!

const headers = {
  'Content-Type': 'application/json',
  'apikey': SERVICE_KEY,
  'Authorization': `Bearer ${SERVICE_KEY}`,
  'Prefer': 'return=representation',
}

async function rest(method: string, path: string, body?: object) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  const data = text ? JSON.parse(text) : null
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status}: ${text}`)
  return data
}

const HINGLISH_VOICE_NOTES = [
  {
    title: 'Google AI Pro ka Mukammal Intro (Hinglish)',
    audio_url: 'placeholder://upload-later',
    purpose: 'Product introduction, first contact',
    when_to_send: 'Jab customer pehli baar interest dikhaye',
    language: 'Roman Urdu',
    status: 'published',
    transcript: `Assalam o Alaikum sir, umeed hai aap khairiyat se honge.

Sir, jo Gemini AI ka plan hai, wo hum 18 months ke liye offer kar rahe hain. Aap pehle apna account check karenge, check karne ke baad aap payment kar sakte hain.

Is plan mein aapko Google AI Pro ka 18 months ka access milta hai, jo fully private hoga, yaani aapki apni personal email par hoga.

Iske andar aap content creation, study, script writing, designing aur presentation waghera sab kuch aasani se kar sakte hain.

Aapko advanced AI models ka higher access milta hai. Jaise ke high-level creation ke liye aap Nano Banana use kar sakte hain, aur research ya notes waghera ke liye aapko NotebookLM milta hai.

Iske ilawa ye Google ke AI tools jaise Gmail aur Docs ke andar bhi direct use ho sakta hai.

Sath hi Google AI Studio se aap voiceover aur presentations bhi karwa sakte hain.

Isme aapko storage bhi milti hai, aur video generation ke credits bhi milte hain, jisse aap basic video generation karwa sakte hain.

Agar aap apna plan activate karwana chahte hain to apni email share kar den, inshallah 5 se 15 minute ke andar aapka access hamari taraf se done ho jayega.`,
  },
  {
    title: 'Owner Account ki Recommendation (Hinglish)',
    audio_url: 'placeholder://upload-later',
    purpose: 'Upsell to Owner Account for heavy users',
    when_to_send: 'Jab customer heavy usage ka zikr kare',
    language: 'Roman Urdu',
    status: 'published',
    transcript: `Acha sir, phir main aapko highly recommend karunga ke aap Owner Account le len.

Agar aapne basic research waghera karni hai to Single User access aapke liye best hai, lekin agar aapki working thodi zyada hai, to Owner Account aapke liye zyada beneficial hai, kyunki isme premium resources aur usage par aapko zyada control milta hai.

Owner Account mein aapko kaafi extra benefits milte hain.

For example, aap Nano Banana se images create karwa sakte hain, aur Veo 3 ke ek account se taqreeban 5 videos per day generate ki ja sakti hain, subject to Google ki current limits.

Iska sabse bara faida ye hai ke isme aapko 5 additional member slots ki access milti hai.

Aap chahen to ye access apne trusted members ko de sakte hain, ya phir apne hi 5 Gmail accounts add kar sakte hain.

Suppose karen aapne apne 5 Gmail accounts add kar diye, to har account ki apni Gemini video generation limits ho sakti hain.

Agar ek account se taqreeban 5 videos daily ki limit available ho to multiple accounts ki wajah se majmoi video generation capacity zyada ho sakti hai.

Lekin ye Google ki current limits aur policies par depend karega, isliye hum ise guaranteed unlimited videos nahi kehte.

Aur haan, Google Flow ke 1,000 monthly credits bhi plan configuration ke mutabiq milte hain.

Agar aap AI ko zyada use karte hain, content creation karte hain, videos banate hain ya multiple accounts ki zaroorat hai, to Owner Account aapke liye zyada suitable rahega.

Agar abhi bhi aapka koi question hai to zaroor pooch len, main aapko properly guide kar dunga.`,
  },
  {
    title: 'Credits, Videos aur Multiple Accounts (Hinglish)',
    audio_url: 'placeholder://upload-later',
    purpose: 'Clarify video generation limits and Flow Credits math',
    when_to_send: 'Jab customer video generation numbers puche',
    language: 'Roman Urdu',
    status: 'published',
    transcript: `Ji sir, agar aapka main kaam videos ya heavy AI usage hai to phir Owner Account zyada behtar option hai.

Isme aapko multiple Gmail slots milte hain, aur har eligible Gmail ki apni Gemini video generation limits ho sakti hain.

Maslan agar kisi account par taqreeban 5 videos per day ki current limit available hai, to 6 accounts ke sath theoretical capacity 30 videos per day tak ban sakti hai.

Lekin ye baat yaad rakhen ke ye Google ki current limits ke mutabiq hai. Hum unlimited videos ki guarantee nahi dete.

Iske ilawa Google Flow ke credits alag hote hain.

Owner Account mein 1,000 Flow Credits per month ki total allocation hoti hai.

Ye 1,000 credits har Gmail ke liye alag alag nahi hote.

Yaani agar aap 5 ya 6 Gmail accounts add karte hain to Flow Credits automatically 5,000 ya 6,000 nahi ho jayenge.

Flow Credits ki total allocation plan ke hisaab se hi hogi.

Agar aapka main focus Gemini video generation hai to multiple accounts ka faida alag hai, jabke Google Flow credits ka system alag hai.

Isi liye agar aap heavy AI user hain to Owner Account zyada practical option banta hai.

Agar aap chahen to main aapko Owner Account ka poora process bhi video ke zariye dikha deta hoon taake aapko har cheez practically clear ho jaye.`,
  },
  {
    title: 'Warranty, Guarantee aur Transparency (Hinglish)',
    audio_url: 'placeholder://upload-later',
    purpose: 'Set expectations on warranty/risk before payment',
    when_to_send: 'Payment se pehle, ya warranty ka sawal aane par',
    language: 'Roman Urdu',
    status: 'published',
    transcript: `Acha sir, ek ahem baat main aapko pehle hi clear kar deta hoon taake baad mein koi confusion na ho.

Ye accounts hamare paas pichle do teen mahinon se stable hain, aur hamari umeed hai ke aage bhi isi tarah chalte rahenge.

Lekin chunke ye Google ki service hai, isliye Google ki taraf se kisi bhi waqt policy, eligibility, limits ya access mein tabdeeli aa sakti hai.

Hum ye nahi kahenge ke Google ki taraf se har surat mein 18 months tak service lazmi chalti rahegi, kyunki Google ke systems aur policies hamare control mein nahi hain.

Aap agar official price dekhen to Google AI Pro ki price kaafi zyada banti hai, jabke yahan aapko ye plan bohat reasonable price par mil raha hai.

Hum chahen to aapko simply ye keh sakte hain ke 18 months ki full guarantee hai, lekin hum long-term business karna chahte hain, isliye hum customer ko pehle hi tamam important cheezen transparent bata dete hain.

Owner Account ke voucher ke maamle mein jab aap voucher claim karenge to aap khud subscription ki validity aur activation details dekh sakenge, aur Google ki taraf se mutalliqa confirmation bhi aa sakti hai.

Ek cheez ki hum apni taraf se full guarantee dete hain:

Agar voucher claim na ho, claim karte waqt koi technical issue aaye, voucher wrong show ho ya expired show ho, to hamari policy ke mutabiq hum replacement voucher provide karenge.

Single User access ke liye hamari apni service warranty ye hai ke hum apni taraf se aapka access 18 months ke doran remove nahi karenge.

Lekin agar Google ki taraf se koi policy violation, restriction, suspension ya access termination hoti hai, to wo hamare control mein nahi hogi aur is surat mein hum iski zimmedari nahi le sakte.

Isi liye hum aapko pehle hi clear information de rahe hain taake aap tamam cheezen samajh kar faisla karen.

Agar aap Single User lena chahte hain to wo bhi available hai, aur agar aap zyada heavy usage ke liye Owner Account lena chahte hain to wo bhi available hai.

Agar ab bhi koi sawal hai to aap zaroor poochen, main aapko properly guide kar dunga.`,
  },
]

async function main() {
  console.log('\n═══════════════════════════════════════════════════════')
  console.log('  SEED: Hinglish Voice Notes (Roman Urdu)')
  console.log('═══════════════════════════════════════════════════════\n')

  // Delete existing Hinglish versions (idempotent re-run)
  const titles = HINGLISH_VOICE_NOTES.map(v => v.title)
  const titleFilter = titles.map(t => `title.eq.${encodeURIComponent(t)}`).join(',')
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/voice_notes?or=(${titleFilter})`, {
      method: 'DELETE',
      headers,
    })
  } catch { /* ignore cleanup errors */ }

  // Insert all 4 Hinglish notes
  const inserted = await rest('POST', 'voice_notes', HINGLISH_VOICE_NOTES)
  console.log(`  ✅ Inserted ${inserted.length} Hinglish voice notes:\n`)
  inserted.forEach((vn: any, i: number) =>
    console.log(`     ${i + 1}. [${vn.language}] ${vn.title}`)
  )

  // Verify total published count
  const countRes = await fetch(
    `${SUPABASE_URL}/rest/v1/voice_notes?status=eq.published&select=id`,
    { headers: { ...headers, 'Prefer': 'count=exact' } }
  )
  const total = countRes.headers.get('content-range')?.split('/')[1] ?? '?'
  console.log(`\n  ℹ️  Total published voice notes in DB: ${total}`)
  console.log('     (4 Urdu + 4 Hinglish = 8 expected)\n')

  if (total === '8') {
    console.log('  🎉 PASS — All 8 voice notes present (4 Urdu + 4 Hinglish)\n')
  } else {
    console.log(`  ⚠️  Count is ${total} — may include pre-existing rows, check DB.\n`)
  }

  process.exit(0)
}

main().catch(e => { console.error('Fatal:', e); process.exit(1) })
