/**
 * Seed: Google AI Pro + Canva Pro Bundle
 *
 * Inserts: 1 Tool, 1 Script (greeting/voice note), 4 Objections, 5 FAQs, 1 Quiz (5 Qs)
 * Uses direct HTTPS REST calls — no supabase-js (avoids WebSocket issue on Node v20)
 *
 * Run: node --env-file=.env.local scripts/seed_canva_bundle.js
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY
const ADMIN_UID    = '9ab2b5d4-e912-4609-b5ba-bc92da398607'

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const headers = {
  'Content-Type': 'application/json',
  'apikey': SERVICE_KEY,
  'Authorization': `Bearer ${SERVICE_KEY}`,
  'Prefer': 'return=representation',
}

async function post(table, body) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`POST ${table} failed (${res.status}): ${text}`)
  }
  return res.json()
}

async function patch(table, id, body) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`PATCH ${table}/${id} failed (${res.status}): ${text}`)
  }
}

async function main() {
  console.log('🚀 Seeding Google AI Pro + Canva Pro Bundle...\n')

  // ─── 1. TOOL ───────────────────────────────────────────────────────────────
  console.log('1/6 Inserting Tool...')
  const [tool] = await post('tools', {
    name: 'Google AI Pro + Canva Pro Bundle',
    category: 'AI Tools',
    description: 'A combo bundle offering Google AI Pro (18-month plan) plus Canva Pro Lifetime for FREE — both activated on your personal email with no password sharing required. Choose Single-User (339 PKR) or Owner Account with 5-member add-on (499 PKR). Payment trust-first approach: Canva Pro is activated first as verification before final payment. 1000+ satisfied customers.',
    pricing: '339 PKR one-time (Single-User Bundle) | 499 PKR one-time (Owner Account — includes 5-member add-on). Canva Pro Lifetime FREE with both tiers.',
    best_for: 'Freelancers, content creators, students, and small business owners who want Google AI Pro + Canva Pro at an affordable one-time price',
    features: [
      'Google AI Pro 18-month plan',
      'Canva Pro Lifetime FREE (included in both tiers)',
      'Activation on personal email — no password sharing',
      'Single-User (339 PKR one-time)',
      'Owner Account (499 PKR) — add up to 5 members',
      'Canva Pro activated first as trust-building step',
      '1000+ happy customers with verifiable reviews',
      '48-hour limited-time offer',
    ],
    tags: ['google-ai', 'canva-pro', 'bundle', '18-month', 'lifetime', 'one-time', 'combo'],
    status: 'published',
  })
  const toolId = tool.id
  console.log(`   ✅ Tool created: ${toolId}\n`)

  // ─── 2. SCRIPT (Voice Note 1 — Bundle Offer Greeting) ────────────────────
  console.log('2/6 Inserting Script (greeting voice note)...')
  await post('scripts', {
    tool_id: toolId,
    title: 'Bundle Offer — Google AI Pro + Canva Pro Lifetime (Opening Voice Note)',
    script_type: 'greeting',
    language: 'Urdu',
    content: `Assalam-o-Alaikum! If you take the Google AI Pro 18-month plan, you get Canva Pro Lifetime absolutely FREE — only 339 PKR, one time.

Google AI Pro and Canva Pro will be activated on your personal email, and you do not need to share your email password.

Owner Account is also available, where you can later add 5 members — its rate is 499 PKR, with Canva Pro completely free for lifetime.

Payment is advance, but for trust, we first activate Canva Pro and verify it before you make the final payment.

We have 1000+ happy customers — you can visit our page to check reviews.

This offer is for 48 hours only. If you want to take it, reply "YES" right now and I will send you the complete details.`,
    content_hinglish: `Assalam-o-Alaikum! Agar aap Google AI Pro ka 18 months plan lete hain, to aapko Canva Pro Lifetime bilkul FREE mil raha hai — sirf 339 price, one time.

Google AI Pro aur Canva Pro aapke personal email par activate honge, aur aapko apne email ka password share karne ki zaroorat nahi.

Owner account bhi available hai, jis mein aap aage 5 members ko add kar sakte hain — uska rate 499 PKR hai, saath Canva Pro bilkul free for lifetime.

Payment advance hoti hai, lekin trust ke liye pehle Canva Pro activate karke verify karwa dete hain.

Baaqi hamare 1000 se zyada happy customers hain, aap hamara page visit kar sakte hain.

Offer sirf 48 hours ke liye hai. Agar lena hai to abhi "YES" reply karein, main complete details send kar deta hoon.`,
    when_to_use: 'Send as first WhatsApp voice note when a new prospect shows interest in Google AI tools or Canva. Ideal for cold outreach and first touchpoints.',
    related_product: 'Google AI Pro + Canva Pro Bundle',
    tags: ['bundle', 'greeting', 'voice-note', 'opening', 'canva-pro', 'google-ai'],
    status: 'published',
  })
  console.log('   ✅ Script inserted\n')

  // ─── 3. OBJECTIONS (4) ─────────────────────────────────────────────────────
  console.log('3/6 Inserting Objections (4)...')

  await post('objections', {
    tool_id: toolId,
    objection_text: 'Itna sasta kyun hai? Kya yeh asli hai ya koi fraud?',
    meaning: 'Customer ko price aur legitimacy par doubt hai. Unhein lagta hai itni kam qeemat par genuine service nahi mil sakti. Yeh trust-building moment hai.',
    recommended_response: `Bilkul samajh sakta hoon aapka concern, sir/ma\'am. Price sasta isliye hai kyunki hum direct reseller hain — koi middleman nahi. Aapko Google ya Canva ka official invoice nahi milta, lekin service bilkul genuine hai.

Isisliye hum ne trust-first approach rakhi hai: aap pehle Canva Pro apne account mein activate hota dekh lein — verify kar lein — phir aap decide karein. Agar verify ho gaya to trust automatic ban jata hai.

Hamari 1000+ customers ki gallery aur reviews publicly available hain — aap pehle woh check kar sakte hain.`,
    alternative_response: 'Aap chahein to pehle sirf Canva Pro part check karwain — bilkul free activation dikhate hain pehle, phir aap khud decide karein aage lena hai ya nahi.',
    do_not_say: 'Haan yeh bahut sasta hai, baaki se sasta hai. (Price ko defend karna is se trust drop hota hai — focus on verification aur social proof par karein)',
    related_product: 'Google AI Pro + Canva Pro Bundle',
    difficulty: 'intermediate',
    status: 'published',
  })

  await post('objections', {
    tool_id: toolId,
    objection_text: '48 hours ka offer sirf ek sales tactic lagta hai — kya yeh sach mein expire hoga?',
    meaning: 'Customer urgency pressure feel kar raha hai aur resist kar raha hai. Woh smart hai aur marketing gimmicks ko identify karta hai. Honest response chahiye.',
    recommended_response: `Aapka doubt bilkul valid hai. Yeh offer hamare bundle pricing ka hissa hai — hum yeh rate sabko indefinitely maintain nahi karte kyunki slots limited hain.

Agar aap 48 hours baad reply karein to main honestly nahi keh sakta rate same hoga ya nahi — kuch baar hota hai, kuch baar nahi.

Lekin main aapko force nahi karunga. Agar aap ready nahi hain to koi problem nahi — jab ready hon, tab baat karein. Hum available hain.`,
    do_not_say: 'Haan offer khatam ho jayega zaroor, abhi le lein! (False scarcity claim se long-term trust khatam hota hai)',
    related_product: 'Google AI Pro + Canva Pro Bundle',
    difficulty: 'intermediate',
    status: 'published',
  })

  await post('objections', {
    tool_id: toolId,
    objection_text: 'Pehle Canva activate karo phir payment — yeh koi trick to nahi? Mere account ka kya hoga?',
    meaning: 'Customer ko Canva Pro activation pehle dene ki process samajh nahi aayi. Woh worried hai ke uska account compromise ho sakta hai ya yeh koi scam hai.',
    recommended_response: `Yeh trick nahi hai — yeh actually aapki protection ke liye hai.

Hum aapke account mein kuch bhi nahin karte. Process yeh hai: aap apni email share karte hain (password ki zaroorat nahi), hum Canva ka invite link bhejte hain, aur aap khud apne account mein Canva Pro activate hota dekhte hain.

Jab aap confirm kar lein ke Canva Pro mil gaya — tab payment hoti hai. Aap kabhi bhi bina verify kiye payment nahi dete.

Yeh isliye hai ke aapko pehle proof mile, phir trust bane.`,
    do_not_say: 'Aap trust karein hume, hum fraud nahi karte. (Empty assurance kaam nahi karta — process explain karna zaroori hai)',
    related_product: 'Google AI Pro + Canva Pro Bundle',
    difficulty: 'beginner',
    status: 'published',
  })

  await post('objections', {
    tool_id: toolId,
    objection_text: 'Canva Pro "Lifetime" kaise possible hai? Yeh kab band ho sakta hai?',
    meaning: 'Customer Canva Pro Lifetime claim par skeptical hai. Woh soch raha hai ke shayad yeh limited time hai ya Canva isko revoke kar sakta hai.',
    recommended_response: `Yeh bahut acha sawaal hai. Canva Pro "Lifetime" iska matlab hai jab tak aapka Canva account active hai, aapko Pro benefits milte rahenge — time-based subscription nahi hai.

Aap khud apne Canva account mein plan status check kar sakte hain ke Pro active hai.

Bilkul same jaise aapke Google account ki koi service active hoti hai — jab tak account hai, benefit hai.

Agar kabhi koi issue aaye to hum support karte hain — yeh hamare service guarantee ka hissa hai.`,
    do_not_say: 'Haan lifetime matlab forever, guaranteed. (Over-promise mat karein — explain karein ke aapka account active rehne tak benefit hai)',
    related_product: 'Google AI Pro + Canva Pro Bundle',
    difficulty: 'advanced',
    status: 'published',
  })

  console.log('   ✅ 4 Objections inserted\n')

  // ─── 4. FAQs (5) ───────────────────────────────────────────────────────────
  console.log('4/6 Inserting FAQs (5)...')

  await post('faqs', {
    tool_id: toolId,
    category: 'Google AI Pro + Canva Pro Bundle',
    question: 'Kya yeh bundle officially Google aur Canva ki taraf se hai?',
    question_hinglish: 'Kya yeh bundle officially Google aur Canva ki taraf se hai?',
    short_answer: 'Hum authorized resellers hain jo access plans resell karte hain. Service genuine hai — aap Canva Pro pehle verify kar sakte hain apne account mein activate hokar, aur Google AI Pro bhi aapke personal email par activate hota hai.',
    short_answer_hinglish: 'Hum authorized resellers hain jo access plans resell karte hain. Service genuine hai — aap Canva Pro pehle verify kar sakte hain apne account mein activate hokar, aur Google AI Pro bhi aapke personal email par activate hota hai.',
    customer_ready_answer: 'Yeh service genuine hai — aap Canva Pro pehle apne account mein verify karte hain (activate hokar dekhte hain), phir payment hoti hai. Google AI Pro bhi aapke personal email par activate hoga. Hum authorized resellers hain aur hamare 1000+ verified customers hain jinhein aap hamara page dekhkar confirm kar sakte hain.',
    customer_ready_answer_hinglish: 'Yeh service genuine hai — aap Canva Pro pehle apne account mein verify karte hain (activate hokar dekhte hain), phir payment hoti hai. Google AI Pro bhi aapke personal email par activate hoga. Hum authorized resellers hain aur hamare 1000+ verified customers hain jinhein aap hamara page dekhkar confirm kar sakte hain.',
    priority: 1,
    status: 'published',
  })

  await post('faqs', {
    tool_id: toolId,
    category: 'Google AI Pro + Canva Pro Bundle',
    question: 'Single-User (339 PKR) aur Owner Account (499 PKR) mein kya fark hai?',
    question_hinglish: 'Single-User (339 PKR) aur Owner Account (499 PKR) mein kya fark hai?',
    short_answer: 'Single-User mein sirf aapka apna access hota hai — 1 Gmail + Canva Pro. Owner Account (499 PKR) mein aap 5 extra member slots add kar sakte hain — unhe aap family, team, ya apne zyada Gmail accounts dede sakte hain. Canva Pro Lifetime dono mein free hai.',
    short_answer_hinglish: 'Single-User mein sirf aapka apna access hota hai — 1 Gmail + Canva Pro. Owner Account (499 PKR) mein aap 5 extra member slots add kar sakte hain — unhe aap family, team, ya apne zyada Gmail accounts dede sakte hain. Canva Pro Lifetime dono mein free hai.',
    customer_ready_answer: 'Single-User plan (339 PKR) aapke ek personal Gmail account par activate hoga — Google AI Pro 18 months + Canva Pro Lifetime. Owner Account (499 PKR) mein aap Owner hote hain aur 5 additional member slots milte hain jinhein aap apne trusted logon ko de sakte hain ya apne extra Gmail accounts add kar sakte hain. Canva Pro Lifetime dono plans mein bilkul FREE hai.',
    customer_ready_answer_hinglish: 'Single-User plan (339 PKR) aapke ek personal Gmail account par activate hoga — Google AI Pro 18 months + Canva Pro Lifetime. Owner Account (499 PKR) mein aap Owner hote hain aur 5 additional member slots milte hain jinhein aap apne trusted logon ko de sakte hain ya apne extra Gmail accounts add kar sakte hain. Canva Pro Lifetime dono plans mein bilkul FREE hai.',
    priority: 2,
    status: 'published',
  })

  await post('faqs', {
    tool_id: toolId,
    category: 'Google AI Pro + Canva Pro Bundle',
    question: '48 hours baad kya offer khatam ho jata hai? Price badh jata hai?',
    question_hinglish: '48 hours baad kya offer khatam ho jata hai? Price badh jata hai?',
    short_answer: '48-hour window mein slots reserved hoti hain. Baad mein availability aur pricing change ho sakti hai. Hum guarantee nahi de sakte same rate milega — depend karta hai current batch par.',
    short_answer_hinglish: '48-hour window mein slots reserved hoti hain. Baad mein availability aur pricing change ho sakti hai. Hum guarantee nahi de sakte same rate milega — depend karta hai current batch par.',
    customer_ready_answer: '48-hour offer iss liye hai ke hum limited batches mein slots allocate karte hain. Baad mein same rate available ho bhi sakta hai, nahi bhi — yeh current batch status par depend karta hai. Agar aap ab lena chahte hain to "YES" reply karein; agar thoda waqt chahiye to koi force nahi — hum available hain.',
    customer_ready_answer_hinglish: '48-hour offer iss liye hai ke hum limited batches mein slots allocate karte hain. Baad mein same rate available ho bhi sakta hai, nahi bhi — yeh current batch status par depend karta hai. Agar aap ab lena chahte hain to "YES" reply karein; agar thoda waqt chahiye to koi force nahi — hum available hain.',
    priority: 3,
    status: 'published',
  })

  await post('faqs', {
    tool_id: toolId,
    category: 'Google AI Pro + Canva Pro Bundle',
    question: 'Canva Pro "Lifetime" hai ya koi time limit hai? Yeh expire kab hoga?',
    question_hinglish: 'Canva Pro "Lifetime" hai ya koi time limit hai? Yeh expire kab hoga?',
    short_answer: 'Canva Pro jab tak aapka Canva account active hai tab tak active rahega — yeh time-limited subscription nahi hai. Aap apne Canva account mein plan status khud check kar sakte hain.',
    short_answer_hinglish: 'Canva Pro jab tak aapka Canva account active hai tab tak active rahega — yeh time-limited subscription nahi hai. Aap apne Canva account mein plan status khud check kar sakte hain.',
    customer_ready_answer: 'Canva Pro Lifetime iska matlab hai jab tak aapka Canva account band nahi hota, aapko Pro benefits milte rahenge — monthly ya yearly renewal ki zaroorat nahi. Activate hone ke baad aap apne Canva account mein "Pro" badge aur status khud verify kar sakte hain. Agar kabhi koi issue aaye to hum support provide karte hain.',
    customer_ready_answer_hinglish: 'Canva Pro Lifetime iska matlab hai jab tak aapka Canva account band nahi hota, aapko Pro benefits milte rahenge — monthly ya yearly renewal ki zaroorat nahi. Activate hone ke baad aap apne Canva account mein "Pro" badge aur status khud verify kar sakte hain. Agar kabhi koi issue aaye to hum support provide karte hain.',
    priority: 4,
    status: 'published',
  })

  await post('faqs', {
    tool_id: toolId,
    category: 'Google AI Pro + Canva Pro Bundle',
    question: 'Activation process kya hai? Email ya password share karni padti hai?',
    question_hinglish: 'Activation process kya hai? Email ya password share karni padti hai?',
    short_answer: 'Sirf aapki Gmail address chahiye — password bilkul share nahi karni. Hum Canva Pro ka invite link bhejte hain jo aap khud apne account mein accept karte hain. Google AI Pro bhi aapki personal email par activate hota hai — no password sharing at all.',
    short_answer_hinglish: 'Sirf aapki Gmail address chahiye — password bilkul share nahi karni. Hum Canva Pro ka invite link bhejte hain jo aap khud apne account mein accept karte hain. Google AI Pro bhi aapki personal email par activate hota hai — no password sharing at all.',
    customer_ready_answer: 'Process bilkul simple aur safe hai: aap sirf apni Gmail address share karte hain — password ki zaroorat nahi. Hum pehle Canva Pro invite link bhejte hain, aap khud apne Canva account mein accept karte hain aur Pro activate hota dekhte hain. Verification ke baad Google AI Pro bhi aapki email par activate ho jata hai. Poora process 5–15 minutes mein complete ho jata hai.',
    customer_ready_answer_hinglish: 'Process bilkul simple aur safe hai: aap sirf apni Gmail address share karte hain — password ki zaroorat nahi. Hum pehle Canva Pro invite link bhejte hain, aap khud apne Canva account mein accept karte hain aur Pro activate hota dekhte hain. Verification ke baad Google AI Pro bhi aapki email par activate ho jata hai. Poora process 5–15 minutes mein complete ho jata hai.',
    priority: 5,
    status: 'published',
  })

  console.log('   ✅ 5 FAQs inserted\n')

  // ─── 5. QUIZ ────────────────────────────────────────────────────────────────
  console.log('5/6 Inserting Quiz + Questions + Options...')
  const [quiz] = await post('quizzes', {
    tool_id: toolId,
    title: 'Google AI Pro + Canva Pro Bundle — Sales Knowledge Quiz',
    description: 'Test your knowledge of the Google AI Pro + Canva Pro Bundle offer before pitching it to customers. Covers pricing tiers, activation process, trust-building approach, urgency window, and common objections.',
    pass_score: 70,
    created_by: ADMIN_UID,
  })
  const quizId = quiz.id
  console.log(`   Quiz created: ${quizId}`)

  // Q1 — Pricing tiers
  const [q1] = await post('quiz_questions', {
    quiz_id: quizId,
    question_text: 'Google AI Pro + Canva Pro Bundle ka Single-User plan kitne PKR mein available hai, aur kya include hai?',
    points: 1,
    order_index: 0,
  })
  await post('quiz_options', [
    { question_id: q1.id, option_text: '339 PKR — Google AI Pro 18-month + Canva Pro Lifetime FREE', is_correct: true,  order_index: 0 },
    { question_id: q1.id, option_text: '499 PKR — Google AI Pro 18-month only',                       is_correct: false, order_index: 1 },
    { question_id: q1.id, option_text: '339 PKR — Google AI Pro 18-month only, Canva Pro alag se',    is_correct: false, order_index: 2 },
    { question_id: q1.id, option_text: '299 PKR — Canva Pro Lifetime only',                           is_correct: false, order_index: 3 },
  ])

  // Q2 — Owner Account
  const [q2] = await post('quiz_questions', {
    quiz_id: quizId,
    question_text: 'Owner Account (499 PKR) mein Single-User se kya extra milta hai?',
    points: 1,
    order_index: 1,
  })
  await post('quiz_options', [
    { question_id: q2.id, option_text: '5 additional member slots add karne ki facility, Canva Pro Lifetime bhi FREE', is_correct: true,  order_index: 0 },
    { question_id: q2.id, option_text: 'Sirf extra Google storage',                                                      is_correct: false, order_index: 1 },
    { question_id: q2.id, option_text: '10 member slots aur 2 saal ka plan',                                             is_correct: false, order_index: 2 },
    { question_id: q2.id, option_text: 'Canva Pro 1 saal + Google AI Pro 6 months',                                      is_correct: false, order_index: 3 },
  ])

  // Q3 — Trust-building payment approach
  const [q3] = await post('quiz_questions', {
    quiz_id: quizId,
    question_text: 'Trust-building ke liye payment se pehle customer ko kya dikhaya jata hai?',
    points: 1,
    order_index: 2,
  })
  await post('quiz_options', [
    { question_id: q3.id, option_text: 'Pehle Canva Pro unke account mein activate karke dikhaya jata hai, phir payment hoti hai', is_correct: true,  order_index: 0 },
    { question_id: q3.id, option_text: 'Invoice ya receipt pehle bheja jata hai',                                                    is_correct: false, order_index: 1 },
    { question_id: q3.id, option_text: 'Customer ko Google account ka demo diya jata hai',                                           is_correct: false, order_index: 2 },
    { question_id: q3.id, option_text: 'Discount diya jata hai pehle payment par',                                                    is_correct: false, order_index: 3 },
  ])

  // Q4 — Password sharing
  const [q4] = await post('quiz_questions', {
    quiz_id: quizId,
    question_text: 'Activation ke liye customer ko kya share karna hota hai?',
    points: 1,
    order_index: 3,
  })
  await post('quiz_options', [
    { question_id: q4.id, option_text: 'Sirf Gmail address — password share karne ki zaroorat nahi', is_correct: true,  order_index: 0 },
    { question_id: q4.id, option_text: 'Gmail address aur Gmail password dono',                        is_correct: false, order_index: 1 },
    { question_id: q4.id, option_text: 'Phone number aur OTP',                                         is_correct: false, order_index: 2 },
    { question_id: q4.id, option_text: 'CNIC aur bank account',                                        is_correct: false, order_index: 3 },
  ])

  // Q5 — 48-hour urgency & honest approach
  const [q5] = await post('quiz_questions', {
    quiz_id: quizId,
    question_text: '"48 hours sirf sales pressure lagta hai" objection par best response kya hai?',
    points: 1,
    order_index: 4,
  })
  await post('quiz_options', [
    { question_id: q5.id, option_text: 'Honestly explain karein ke slots limited hain aur rate guarantee nahi ho sakta baad mein — force nahi karein, customer decide kare', is_correct: true,  order_index: 0 },
    { question_id: q5.id, option_text: 'Bol dein "haan, kal rate double ho jayega" taake urgency feel ho',                                                                     is_correct: false, order_index: 1 },
    { question_id: q5.id, option_text: 'Topic badal dein aur price discount offer karein',                                                                                      is_correct: false, order_index: 2 },
    { question_id: q5.id, option_text: 'Bol dein offer actually 30 days valid hai, 48 hours sirf estimate tha',                                                                 is_correct: false, order_index: 3 },
  ])

  console.log('   ✅ Quiz + 5 questions + 20 options inserted\n')

  // ─── 6. SYNC KNOWLEDGE SUMMARY ──────────────────────────────────────────────
  console.log('6/6 Triggering knowledge summary sync...')
  const summaryParts = [
    `Google AI Pro + Canva Pro Bundle — Key Facts:`,
    `About: A combo bundle offering Google AI Pro (18-month plan) plus Canva Pro Lifetime for FREE — both activated on your personal email with no password sharing required. Choose Single-User (339 PKR) or Owner Account with 5-member add-on (499 PKR). Payment trust-first: Canva Pro activated first as verification. 1000+ satisfied customers.`,
    `Pricing: 339 PKR one-time (Single-User Bundle) | 499 PKR one-time (Owner Account — includes 5-member add-on). Canva Pro Lifetime FREE with both tiers.`,
    `Best for: Freelancers, content creators, students, and small business owners who want Google AI Pro + Canva Pro at an affordable one-time price`,
    `Features: Google AI Pro 18-month plan, Canva Pro Lifetime FREE (included in both tiers), Activation on personal email — no password sharing, Single-User (339 PKR one-time), Owner Account (499 PKR) — add up to 5 members, Canva Pro activated first as trust-building step, 1000+ happy customers with verifiable reviews, 48-hour limited-time offer`,
    ``,
    `Frequently Asked Questions:`,
    `Q: Kya yeh bundle officially Google aur Canva ki taraf se hai?\nA: Hum authorized resellers hain jo access plans resell karte hain. Service genuine hai — aap Canva Pro pehle verify kar sakte hain apne account mein activate hokar, aur Google AI Pro bhi aapke personal email par activate hota hai.`,
    `Q: Single-User (339 PKR) aur Owner Account (499 PKR) mein kya fark hai?\nA: Single-User mein sirf aapka apna access hota hai — 1 Gmail + Canva Pro. Owner Account (499 PKR) mein aap 5 extra member slots add kar sakte hain. Canva Pro Lifetime dono mein free hai.`,
    `Q: 48 hours baad kya offer khatam ho jata hai?\nA: 48-hour window mein slots reserved hoti hain. Baad mein availability aur pricing change ho sakti hai.`,
    `Q: Canva Pro "Lifetime" hai ya koi time limit hai?\nA: Canva Pro jab tak aapka Canva account active hai tab tak active rahega — yeh time-limited subscription nahi hai.`,
    `Q: Activation process kya hai? Email ya password share karni padti hai?\nA: Sirf aapki Gmail address chahiye — password bilkul share nahi karni. Canva Pro invite aap khud accept karte hain.`,
    ``,
    `Common Objections & Responses:`,
    `Objection: Itna sasta kyun hai? Kya yeh asli hai ya fraud?\nMeaning: Customer ko price aur legitimacy par doubt hai\nRecommended Response: Trust-first approach — pehle Canva Pro verify karwain, phir payment. 1000+ customer reviews check karwain.\nDO NOT SAY: Price defend karna — focus on verification`,
    `Objection: 48 hours ka offer sirf sales tactic lagta hai\nMeaning: Customer urgency pressure resist kar raha hai\nRecommended Response: Honestly bolein slots limited hain, same rate guarantee nahi — force nahi karein`,
    `Objection: Pehle Canva activate karo phir payment — trick to nahi?\nMeaning: Customer activation process se unfamiliar aur worried hai\nRecommended Response: Process explain karein — email share, Canva invite accept, verify, then payment`,
    `Objection: Canva Pro Lifetime kaise possible? Kab band hoga?\nMeaning: Customer Lifetime claim par skeptical hai\nRecommended Response: Account active rehne tak benefit milta hai — customer apne account mein status check kar sakta hai`,
    ``,
    `Sales Scripts:`,
    `Bundle Offer Voice Note (Hinglish): Assalam-o-Alaikum! Agar aap Google AI Pro ka 18 months plan lete hain, to aapko Canva Pro Lifetime bilkul FREE mil raha hai — sirf 339 price, one time. Google AI Pro aur Canva Pro aapke personal email par activate honge, aur aapko apne email ka password share karne ki zaroorat nahi. Owner account bhi available hai, jis mein aap aage 5 members ko add kar sakte hain — uska rate 499 PKR hai, saath Canva Pro bilkul free for lifetime. Payment advance hoti hai, lekin trust ke liye pehle Canva Pro activate karke verify karwa dete hain. Hamare 1000 se zyada happy customers hain. Offer sirf 48 hours ke liye hai.`,
  ]
  const summary = summaryParts.join('\n')

  const syncRes = await fetch(`${SUPABASE_URL}/rest/v1/tools?id=eq.${toolId}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({
      knowledge_summary: summary,
      knowledge_summary_source: 'auto',
      knowledge_summary_updated_at: new Date().toISOString(),
    }),
  })
  if (!syncRes.ok) {
    const t = await syncRes.text()
    console.warn(`   ⚠️  Knowledge sync PATCH failed: ${syncRes.status} — ${t}`)
  } else {
    console.log(`   ✅ Knowledge summary written (${summary.length} chars)\n`)
  }

  console.log('✅ All done!')
  console.log(`   Tool ID: ${toolId}`)
  console.log(`   Quiz ID: ${quizId}`)
  console.log('\nVerify live:')
  console.log('  • Admin → Scripts → filter "Google AI Pro + Canva Pro Bundle"')
  console.log('  • Admin → Objections → filter same')
  console.log('  • Admin → FAQs → filter same')
  console.log('  • Admin → Quizzes → find "Google AI Pro + Canva Pro Bundle — Sales Knowledge Quiz"')
}

main().catch(e => { console.error('Fatal:', e); process.exit(1) })
