/**
 * Sales Academy — Training Content Seed Script
 * Seeds: 4 Voice Notes, 18 FAQs, 8 Objections, 10 Scripts, 1 Lesson with 20 content blocks
 *
 * Run: npx tsx --env-file=.env.local scripts/seed_training_content.ts
 */

// @ts-ignore
import ws from 'ws'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  global: { fetch },
  realtime: { transport: ws as any },
  auth: { autoRefreshToken: false, persistSession: false },
})

// ─── Helpers ─────────────────────────────────────────────────────────────────
let errors: string[] = []
function log(msg: string) { console.log(msg) }
function err(msg: string) { console.error('  ❌ ' + msg); errors.push(msg) }
async function query<T>(label: string, fn: () => Promise<{ data: T | null; error: any }>): Promise<T | null> {
  const { data, error } = await fn()
  if (error) { err(`${label}: ${error.message}`); return null }
  return data
}

// ─── 1. VOICE NOTES ──────────────────────────────────────────────────────────
const VOICE_NOTES = [
  {
    title: 'Google AI Pro کا مکمل تعارف',
    audio_url: 'placeholder://upload-later',
    purpose: 'Product introduction, first contact',
    when_to_send: 'Jab customer pehli baar interest dikhaye',
    language: 'Urdu',
    status: 'published',
    transcript: `السلام علیکم سر، امید ہے آپ خیریت سے ہوں گے۔

سر، جو جیمنی اے آئی کا پلان ہے، وہ ہم 18 months کے لیے offer کر رہے ہیں۔ آپ پہلے اپنا اکاؤنٹ چیک کریں گے، چیک کرنے کے بعد آپ پیمنٹ کر سکتے ہیں۔

اس پلان میں آپ کو Google AI Pro کا 18 months کا access ملتا ہے، جو fully private ہوگا، یعنی آپ کی اپنی personal email پر ہوگا۔

اس کے اندر آپ content creation، study، script writing، designing اور presentation وغیرہ سب کچھ آسانی سے کر سکتے ہیں۔

آپ کو advanced AI models کا higher access ملتا ہے۔ جیسے کہ high-level creation کے لیے آپ Nano Banana استعمال کر سکتے ہیں، اور research یا notes وغیرہ کے لیے آپ کو NotebookLM ملتا ہے۔

اس کے علاوہ یہ Google کے AI tools جیسے Gmail اور Docs کے اندر بھی direct use ہو سکتا ہے۔

ساتھ ہی Google AI Studio سے آپ voiceover اور presentations بھی کروا سکتے ہیں۔

اس میں آپ کو storage بھی ملتی ہے، اور video generation کے credits بھی ملتے ہیں، جس سے آپ basic video generation کروا سکتے ہیں۔

اگر آپ اپنا پلان activate کروانا چاہتے ہیں تو اپنی ای میل شیئر کر دیں، ان شاء اللہ 5 سے 15 منٹ کے اندر آپ کا access ہماری طرف سے done ہو جائے گا۔`,
  },
  {
    title: 'Owner Account کی Recommendation',
    audio_url: 'placeholder://upload-later',
    purpose: 'Upsell to Owner Account for heavy users',
    when_to_send: 'Jab customer heavy usage ka zikr kare',
    language: 'Urdu',
    status: 'published',
    transcript: `اچھا سر، پھر میں آپ کو highly recommend کروں گا کہ آپ Owner Account لے لیں۔

اگر آپ نے basic research وغیرہ کرنی ہے تو Single User access آپ کے لیے best ہے، لیکن اگر آپ کی working تھوڑی زیادہ ہے، تو Owner Account آپ کے لیے زیادہ beneficial ہے، کیونکہ اس میں premium resources اور usage پر آپ کو زیادہ control ملتا ہے۔

Owner Account میں آپ کو کافی extra benefits ملتے ہیں۔

For example، آپ Nano Banana سے images create کروا سکتے ہیں، اور Veo 3 کے ایک account سے تقریباً 5 videos per day generate کی جا سکتی ہیں، subject to Google کی current limits۔

اس کا سب سے بڑا فائدہ یہ ہے کہ اس میں آپ کو 5 additional member slots کی access ملتی ہے۔

آپ چاہیں تو یہ access اپنے trusted members کو دے سکتے ہیں، یا پھر اپنے ہی 5 Gmail accounts add کر سکتے ہیں۔

Suppose کریں آپ نے اپنے 5 Gmail accounts add کر دیے، تو ہر account کی اپنی Gemini video generation limits ہو سکتی ہیں۔

اگر ایک account سے تقریباً 5 videos daily کی limit available ہو تو multiple accounts کی وجہ سے مجموعی video generation capacity زیادہ ہو سکتی ہے۔

لیکن یہ Google کی current limits اور policies پر depend کرے گا، اس لیے ہم اسے guaranteed unlimited videos نہیں کہتے۔

اور ہاں، Google Flow کے 1,000 monthly credits بھی plan configuration کے مطابق ملتے ہیں۔

اگر آپ AI کو زیادہ use کرتے ہیں، content creation کرتے ہیں، videos بناتے ہیں یا multiple accounts کی ضرورت ہے، تو Owner Account آپ کے لیے زیادہ suitable رہے گا۔

اگر ابھی بھی آپ کا کوئی question ہے تو ضرور پوچھ لیں، میں آپ کو properly guide کر دوں گا۔`,
  },
  {
    title: 'Credits، Videos اور Multiple Accounts',
    audio_url: 'placeholder://upload-later',
    purpose: 'Clarify video generation limits and Flow Credits math',
    when_to_send: 'Jab customer video generation numbers puche',
    language: 'Urdu',
    status: 'published',
    transcript: `جی سر، اگر آپ کا main کام videos یا heavy AI usage ہے تو پھر Owner Account زیادہ بہتر option ہے۔

اس میں آپ کو multiple Gmail slots ملتے ہیں، اور ہر eligible Gmail کی اپنی Gemini video generation limits ہو سکتی ہیں۔

مثلاً اگر کسی account پر تقریباً 5 videos per day کی current limit available ہے، تو 6 accounts کے ساتھ theoretical capacity 30 videos per day تک بن سکتی ہے۔

لیکن یہ بات یاد رکھیں کہ یہ Google کی current limits کے مطابق ہے۔ ہم unlimited videos کی guarantee نہیں دیتے۔

اس کے علاوہ Google Flow کے credits الگ ہوتے ہیں۔

Owner Account میں 1,000 Flow Credits per month کی total allocation ہوتی ہے۔

یہ 1,000 credits ہر Gmail کے لیے الگ الگ نہیں ہوتے۔

یعنی اگر آپ 5 یا 6 Gmail accounts add کرتے ہیں تو Flow Credits automatically 5,000 یا 6,000 نہیں ہو جائیں گے۔

Flow Credits کی total allocation plan کے حساب سے ہی ہوگی۔

اگر آپ کا main focus Gemini video generation ہے تو multiple accounts کا فائدہ الگ ہے، جبکہ Google Flow credits کا system الگ ہے۔

اسی لیے اگر آپ heavy AI user ہیں تو Owner Account زیادہ practical option بنتا ہے۔

اگر آپ چاہیں تو میں آپ کو Owner Account کا پورا process بھی video کے ذریعے دکھا دیتا ہوں تاکہ آپ کو ہر چیز practically clear ہو جائے۔`,
  },
  {
    title: 'Warranty، Guarantee اور Transparency',
    audio_url: 'placeholder://upload-later',
    purpose: 'Set expectations on warranty/risk before payment',
    when_to_send: 'Payment se pehle, ya warranty ka sawal aane par',
    language: 'Urdu',
    status: 'published',
    transcript: `اچھا سر، ایک اہم بات میں آپ کو پہلے ہی clear کر دیتا ہوں تاکہ بعد میں کوئی confusion نہ ہو۔

یہ accounts ہمارے پاس پچھلے دو تین مہینوں سے stable ہیں، اور ہماری امید ہے کہ آگے بھی اسی طرح چلتے رہیں گے۔

لیکن چونکہ یہ Google کی service ہے، اس لیے Google کی طرف سے کسی بھی وقت policy، eligibility، limits یا access میں تبدیلی آ سکتی ہے۔

ہم یہ نہیں کہیں گے کہ Google کی طرف سے ہر صورت میں 18 months تک service لازمی چلتی رہے گی، کیونکہ Google کے systems اور policies ہمارے control میں نہیں ہیں۔

آپ اگر official price دیکھیں تو Google AI Pro کی price کافی زیادہ بنتی ہے، جبکہ یہاں آپ کو یہ plan بہت reasonable price پر مل رہا ہے۔

ہم چاہیں تو آپ کو simply یہ کہہ سکتے ہیں کہ 18 months کی full guarantee ہے، لیکن ہم long-term business کرنا چاہتے ہیں، اس لیے ہم customer کو پہلے ہی تمام important چیزیں transparent بتاتے ہیں۔

Owner Account کے voucher کے معاملے میں جب آپ voucher claim کریں گے تو آپ خود subscription کی validity اور activation details دیکھ سکیں گے، اور Google کی طرف سے متعلقہ confirmation بھی آ سکتی ہے۔

ایک چیز کی ہم اپنی طرف سے full guarantee دیتے ہیں:

اگر voucher claim نہ ہو، claim کرتے وقت کوئی technical issue آئے، voucher wrong show ہو یا expired show ہو، تو ہماری policy کے مطابق ہم replacement voucher provide کریں گے۔

Single User access کے لیے ہماری اپنی service warranty یہ ہے کہ ہم اپنی طرف سے آپ کا access 18 months کے دوران remove نہیں کریں گے۔

لیکن اگر Google کی طرف سے کوئی policy violation، restriction، suspension یا access termination ہوتی ہے، تو وہ ہمارے control میں نہیں ہوگی اور اس صورت میں ہم اس کی ذمہ داری نہیں لے سکتے۔

اسی لیے ہم آپ کو پہلے ہی clear information دے رہے ہیں تاکہ آپ تمام چیزیں سمجھ کر فیصلہ کریں۔

اگر آپ Single User لینا چاہتے ہیں تو وہ بھی available ہے، اور اگر آپ زیادہ heavy usage کے لیے Owner Account لینا چاہتے ہیں تو وہ بھی available ہے۔

اگر اب بھی کوئی سوال ہے تو آپ ضرور پوچھیں، میں آپ کو properly guide کر دوں گا۔`,
  },
]

// ─── 2. FAQS ─────────────────────────────────────────────────────────────────
const FAQS = [
  {
    question: 'Google AI Pro کیا ہے؟',
    short_answer: 'Sir ye Google ka advanced AI plan hai jisme Gemini Advanced, storage, aur baaki AI tools shamil hain.',
    customer_ready_answer: 'Sir ye Google ka advanced AI plan hai jisme Gemini Advanced, storage, aur baaki AI tools shamil hain.',
    detailed_answer: 'Google AI Pro (Gemini Advanced) Google ka premium AI subscription plan hai. Isme aapko Gemini Advanced ka access milta hai jisme Nano Banana (image/content creation), NotebookLM (research aur notes), Veo 3 (video generation), Google AI Studio, Gmail/Docs integration, aur 2TB tak storage shamil hain. Ye plan heavy AI users, content creators aur professionals ke liye design kiya gaya hai.',
    category: 'Product',
    status: 'published',
  },
  {
    question: 'سنگل یوزر کی کیا پرائس ہے؟',
    short_answer: 'Single user sirf Rs. 499 mein available hai sir.',
    customer_ready_answer: 'Single user sirf Rs. 499 mein available hai sir.',
    detailed_answer: 'Single User plan sirf Rs. 499 mein available hai. Isme aapko 18 months ke liye Google AI Pro ka personal access milta hai — aapki apni Gmail par. Ye option un logo ke liye best hai jo individual basis par Gemini Advanced use karna chahte hain.',
    category: 'Pricing',
    status: 'published',
  },
  {
    question: 'اونر اکاؤنٹ کی پرائس کیا ہے؟',
    short_answer: 'Owner account ki price Rs. 999 hai sir.',
    customer_ready_answer: 'Owner account ki price Rs. 999 hai sir.',
    detailed_answer: 'Owner Account Rs. 999 mein available hai. Is plan mein aapko owner access ke sath 5 additional member slots milte hain, jisme aap apni Gmail IDs add kar sakte hain ya trusted members ko access de sakte hain. Heavy AI usage, video generation aur multiple accounts ke liye ye zyada suitable hai.',
    category: 'Pricing',
    status: 'published',
  },
  {
    question: 'کیا سنگل یوزر میں میرا ڈیٹا پرائیویٹ رہے گا؟',
    short_answer: 'Ji sir, aapka personal data fully private rehta hai. Bas kuch premium resources ya usage limits shared ho sakti hain.',
    customer_ready_answer: 'Ji sir, aapka personal data fully private rehta hai. Bas kuch premium resources ya usage limits shared ho sakti hain.',
    detailed_answer: 'Aapki chats, documents, aur personal data bilkul private rehte hain — koi aur nahi dekh sakta. Single User plan mein sirf kuch premium service resources aur usage limits shared ho sakti hain, lekin aapka actual content aur data completely private rehta hai.',
    category: 'Privacy',
    status: 'published',
  },
  {
    question: 'کیا دوسرے لوگ میری چیٹس پڑھ سکتے ہیں؟',
    short_answer: 'Nahi sir, customer ka data aur chats bilkul private rehte hain. Sirf premium service resources shared hoti hain.',
    customer_ready_answer: 'Nahi sir, customer ka data aur chats bilkul private rehte hain. Sirf premium service resources shared hoti hain.',
    detailed_answer: 'Bilkul nahi sir. Aapki conversations, prompts, aur Gemini ke sath ki gai sari chats sirf aapke account mein hoti hain. Koi bhi doosra user — chahe owner ho — aapki chats nahi dekh sakta. Shared sirf service tier aur usage limits hoti hain, individual data nahi.',
    category: 'Privacy',
    status: 'published',
  },
  {
    question: 'اونر اکاؤنٹ کیا ہوتا ہے؟',
    short_answer: 'Owner account mein owner access ke sath 5 additional member slots milte hain. Ye heavy AI users aur multiple Gmail use karne walon ke liye zyada suitable hai.',
    customer_ready_answer: 'Owner account mein owner access ke sath 5 additional member slots milte hain. Ye heavy AI users aur multiple Gmail use karne walon ke liye zyada suitable hai.',
    detailed_answer: 'Owner Account ek premium tier hai jisme aapko apna personal Gemini access milta hai, sath hi 5 additional Gmail slots bhi milte hain. In slots mein aap apne family members, team members, ya apni hi different Gmail IDs add kar sakte hain. Ye plan un logo ke liye best hai jo video generation, content creation, ya multiple accounts ka benefit lena chahte hain. Google Flow ke 1,000 monthly credits bhi is plan mein available hain.',
    category: 'Owner Account',
    status: 'published',
  },
  {
    question: 'کیا میں پانچ اپنی جی میل ایڈ کر سکتا ہوں؟',
    short_answer: 'Ji sir, available slots mein aap apni Gmail IDs add kar sakte hain, ya trusted members ko access de sakte hain.',
    customer_ready_answer: 'Ji sir, available slots mein aap apni Gmail IDs add kar sakte hain, ya trusted members ko access de sakte hain.',
    detailed_answer: 'Ji bilkul sir. Owner Account ke additional member slots mein aap chahen to apni 5 alag Gmail IDs add kar sakte hain, ya apne trusted family/team members ko invite kar sakte hain. Har eligible Gmail account ki apni video generation limits ho sakti hain, jo overall capacity badha sakti hain.',
    category: 'Owner Account',
    status: 'published',
  },
  {
    question: 'کیا میں یہ ایکسس آگے سیل کر سکتا ہوں؟',
    short_answer: 'Agar aapki business arrangement allow karti ho to aap members ko access de sakte hain, lekin Google ki terms follow karni hongi.',
    customer_ready_answer: 'Agar aapki business arrangement allow karti ho to aap members ko access de sakte hain, lekin Google ki terms follow karni hongi.',
    detailed_answer: 'Owner Account ke member slots mein aap trusted individuals ko access de sakte hain. Lekin Google ki terms of service ke mutabiq commercial reselling ya aisa koi arrangement jo Google ki policies ke khilaf ho, allowed nahi hoga. Apni arrangement Google ki guidelines ke andar rakh kar hi proceed karna chahiye.',
    category: 'Owner Account',
    status: 'published',
  },
  {
    question: 'ویو 3 سے کتنی ویڈیوز بنیں گی؟',
    short_answer: 'Current account limits ke mutabiq roughly 5 videos per account per day ban sakti hain.',
    customer_ready_answer: 'Current account limits ke mutabiq roughly 5 videos per account per day ban sakti hain.',
    detailed_answer: 'Veo 3 ke sath current Google limits ke mutabiq ek account se approximately 5 videos per day tak generate karna possible ho sakta hai. Ye number Google ki policies aur server availability ke sath change ho sakta hai. Owner Account mein multiple Gmail slots ki wajah se theoretical capacity badh sakti hai, lekin ye guaranteed nahi hai.',
    category: 'Veo 3',
    status: 'published',
  },
  {
    question: '6 جی میل ہوں تو 30 ویڈیوز روزانہ بنیں گی؟',
    short_answer: 'Agar har account pe 5 videos ki limit ho to theoretical capacity 30 tak ban sakti hai, lekin ye guaranteed nahi hai. Actual limits Google ki current policy ke mutabiq hongi.',
    customer_ready_answer: 'Agar har account pe 5 videos ki limit ho to theoretical capacity 30 tak ban sakti hai, lekin ye guaranteed nahi hai. Actual limits Google ki current policy ke mutabiq hongi.',
    detailed_answer: 'Mathematically, agar 6 Gmail accounts mein se har ek par 5 videos per day ki limit available ho, to total capacity 30 videos per day tak ho sakti hai. Lekin ye theoretical calculation hai — actual performance Google ki current server capacity, per-account policies, aur availability par depend karti hai. Hum ise guaranteed nahi kehte.',
    category: 'Veo 3',
    status: 'published',
  },
  {
    question: 'کیا 1,000 فلو کریڈٹس ہر جی میل کو ملیں گے؟',
    short_answer: 'Nahi sir, 1,000 Flow credits har Gmail ke liye alag nahi hote. Ye owner account ki total monthly allocation hai.',
    customer_ready_answer: 'Nahi sir, 1,000 Flow credits har Gmail ke liye alag nahi hote. Ye owner account ki total monthly allocation hai.',
    detailed_answer: 'Google Flow credits plan level par allocate hote hain, individual Gmail slots par nahi. Owner Account mein total 1,000 Flow Credits per month milte hain — ye 6 Gmails add karne par 6,000 nahi ban jate. Video generation slots (Veo 3) aur Flow Credits do alag systems hain.',
    category: 'Flow Credits',
    status: 'published',
  },
  {
    question: '5 جی میل ہوں تو 5,000 کریڈٹس ہوں گے؟',
    short_answer: 'Nahi, Gmail slots badhne se Flow credits automatically multiply nahi hote. Total allocation plan ke hisaab se hi rahegi.',
    customer_ready_answer: 'Nahi, Gmail slots badhne se Flow credits automatically multiply nahi hote. Total allocation plan ke hisaab se hi rahegi.',
    detailed_answer: 'Gmail member slots sirf Gemini access aur video generation capacity ke liye hain. Flow Credits alag system hai — inki total allocation sirf 1,000 per month hai chahe aap 1 Gmail use karo ya 5. Dono systems ke benefits alag alag samajhne chahiye.',
    category: 'Flow Credits',
    status: 'published',
  },
  {
    question: 'کیا اینٹی گریویٹی شامل ہے؟',
    short_answer: 'Ji, agar current plan configuration mein Anti-Gravity shamil hai to owner account mein ye available hoga. Owner account heavy users ke liye behtar hai.',
    customer_ready_answer: 'Ji, agar current plan configuration mein Anti-Gravity shamil hai to owner account mein ye available hoga. Owner account heavy users ke liye behtar hai.',
    detailed_answer: 'Anti-Gravity feature ki availability current plan configuration ke sath link hai. Agar plan mein include hai to Owner Account level par ye benefit milega. Heavy users ke liye Owner Account waise bhi zyada resources aur flexibility offer karta hai.',
    category: 'Anti-Gravity',
    status: 'published',
  },
  {
    question: 'کیا 18 ماہ کی وارنٹی ہے؟',
    short_answer: 'Hum apni taraf se access remove na karne ki service warranty dete hain, lekin Google ki taraf se restriction ya policy change hamare control mein nahi hai.',
    customer_ready_answer: 'Hum apni taraf se access remove na karne ki service warranty dete hain, lekin Google ki taraf se restriction ya policy change hamare control mein nahi hai.',
    detailed_answer: 'Hamari service warranty ye hai ki hum khud 18 months ke dauran aapka access remove nahi karte. Lekin Google ki policies, eligibility changes, ya server-side restrictions hamare control mein nahi hain. Hum transparent rehna prefer karte hain isliye ye baat pehle hi clear kar dete hain.',
    category: 'Warranty',
    status: 'published',
  },
  {
    question: 'اگر واؤچر کام نہ کرے تو؟',
    short_answer: 'Agar voucher claim na ho, technical issue aaye, ya expired show ho to hamari policy ke mutabiq replacement voucher provide kiya jayega.',
    customer_ready_answer: 'Agar voucher claim na ho, technical issue aaye, ya expired show ho to hamari policy ke mutabiq replacement voucher provide kiya jayega.',
    detailed_answer: 'Agar aapko voucher claim karte waqt koi technical masla aaye — jaise voucher expired show ho, claim fail ho ya wrong information show ho — to hum hamari replacement guarantee ke tahat naya valid voucher provide karte hain. Ye hamari apni direct guarantee hai.',
    category: 'Guarantee',
    status: 'published',
  },
  {
    question: 'اگر گوگل نے اکاؤنٹ بند کر دیا تو؟',
    short_answer: 'Agar Google ki taraf se policy violation ya restriction ho to wo hamare control mein nahi hai. Hamari guarantee voucher aur initial activation tak hai.',
    customer_ready_answer: 'Agar Google ki taraf se policy violation ya restriction ho to wo hamare control mein nahi hai. Hamari guarantee voucher aur initial activation tak hai.',
    detailed_answer: 'Agar Google apni policy ke tehet kisi bhi account ko restrict kare ya close kare, to ye hamare control ke bahar hai aur hum us situation ki zimmedari nahi le sakte. Hamari guarantee specifically voucher activation aur hamari apni service actions tak hai. Isliye hum pehle se hi sab kuch transparent bata dete hain.',
    category: 'Safety',
    status: 'published',
  },
  {
    question: 'پیمنٹ پہلے کیوں کروں؟',
    short_answer: 'Hamari normal policy advance payment ki hai sir. Tasalli ke liye aap hamare customer reviews check kar sakte hain.',
    customer_ready_answer: 'Hamari normal policy advance payment ki hai sir. Tasalli ke liye aap hamare customer reviews check kar sakte hain.',
    detailed_answer: 'Hamari standard business policy advance payment ki hai — ye process dono taraf ke liye secure hai. Agar aap confident nahi hain to hum aapko customer reviews aur previous buyers ke experiences share kar sakte hain. Ye hamare existing customers ne authenticate kiya hua hai.',
    category: 'Payment',
    status: 'published',
  },
  {
    question: 'پہلے چیک کروا دیں پھر پیمنٹ کروں گا؟',
    short_answer: 'Sir agar aapke paas pichli online deal ka koi proof hai to share kar den, hum voucher-first option consider kar sakte hain, warna advance payment hai.',
    customer_ready_answer: 'Sir agar aapke paas pichli online deal ka koi proof hai to share kar den, hum voucher-first option consider kar sakte hain, warna advance payment hai.',
    detailed_answer: 'Hamari default policy advance payment hai. Lekin agar aap kisi aur seller ke sath successful deal ka proof share kar saken (jaise screenshot ya reference), to hum case-by-case basis par voucher-first option consider kar sakte hain. Warna reviews dekh kar advance mein aayen — bahut customers aisa hi karte hain.',
    category: 'Payment',
    status: 'published',
  },
]

// ─── 3. OBJECTIONS ───────────────────────────────────────────────────────────
// difficulty column: 'beginner' | 'intermediate' | 'advanced'
// mapping: Easy→beginner, Medium→intermediate, Hard→advanced
const OBJECTIONS = [
  {
    objection_text: 'اتنا سستا کیوں ہے؟ کہیں فراڈ تو نہیں؟',
    meaning: 'کسٹمر کو لگتا ہے پرائس بہت کم ہے اس لیے scam ہو سکتا ہے۔',
    recommended_response: 'سر یہ آفیشل پرائس سے کافی کم ضرور ہے، کیونکہ ہم بلک میں اکاؤنٹس حاصل کرتے ہیں، اسی لیے آپ کو ریزنیبل پرائس مل رہی ہے۔ آپ ہمارے پرانے کسٹمرز کے ریویوز چیک کر سکتے ہیں، اور واؤچر نہ چلنے کی صورت میں ریپلیسمنٹ گارنٹی بھی موجود ہے۔',
    alternative_response: 'سر ہمارا بزنس مکمل طور پر ریویوز اور ریپیٹ کسٹمرز پر چلتا ہے، اگر ہم فراڈ کرتے تو اتنے عرصے سے سروس نہ چل رہی ہوتی۔',
    do_not_say: 'بھروسہ نہیں تو مت لیں۔',
    difficulty: 'intermediate',
    status: 'published',
  },
  {
    objection_text: 'پہلے اکاؤنٹ دکھا دیں پھر پیمنٹ کروں گا۔',
    meaning: 'کسٹمر رسک سے بچنا چاہتا ہے۔',
    recommended_response: 'سر ہماری پالیسی ایڈوانس پیمنٹ کی ہے تاکہ دونوں طرف سے پروسیس محفوظ رہے۔ آپ ہمارے کسٹمر ریویوز دیکھ سکتے ہیں تسلی کے لیے۔',
    alternative_response: 'اگر آپ کے پاس پچھلی کسی ڈیل کا پروف ہو تو ہم واؤچر فرسٹ آپشن بھی کنسیڈر کر سکتے ہیں۔',
    do_not_say: 'نہیں ہو سکتا، بس یہی رول ہے۔',
    difficulty: 'intermediate',
    status: 'published',
  },
  {
    objection_text: 'اگر گوگل نے بعد میں بند کر دیا تو میرا پیسہ ضائع ہو جائے گا۔',
    meaning: 'کسٹمر long-term رسک سے ڈر رہا ہے۔',
    recommended_response: 'سر یہ اکاؤنٹس پچھلے کئی مہینوں سے سٹیبل چل رہے ہیں۔ ہم یہ کبھی نہیں کہیں گے کہ گوگل کبھی کوئی تبدیلی نہیں کرے گا، کیونکہ یہ ہمارے کنٹرول میں نہیں۔ لیکن ہماری طرف سے سروس وارنٹی موجود ہے، اور واؤچر ایشو کی صورت میں ریپلیسمنٹ گارنٹی بھی ہے۔',
    alternative_response: 'آفیشل پرائس اور اس ڈسکاؤنٹڈ پرائس کا فرق دیکھیں تو رسک بہت کم ہے۔',
    do_not_say: 'کچھ نہیں ہوگا، 100% گارنٹی ہے۔',
    difficulty: 'advanced',
    status: 'published',
  },
  {
    objection_text: 'دوسری جگہ سستا مل رہا ہے۔',
    meaning: 'پرائس سینسیٹو کسٹمر، compare کر رہا ہے۔',
    recommended_response: 'سر پرائس کے ساتھ سروس کوالٹی اور سپورٹ بھی دیکھیں۔ ہم واؤچر ایشو کی صورت میں ریپلیسمنٹ دیتے ہیں اور فوری سپورٹ بھی دستیاب ہے۔',
    alternative_response: 'اگر آپ چاہیں تو میں آپ کو ہماری سروس کی ڈیٹیل بتا دیتا ہوں، پھر آپ خود فیصلہ کر لیں۔',
    do_not_say: 'وہ جھوٹ بول رہے ہیں۔ (competitor کو badnaam نہ کریں)',
    difficulty: 'intermediate',
    status: 'published',
  },
  {
    objection_text: 'مجھے تھوڑا سوچنا ہے۔',
    meaning: 'فیصلہ delay کر رہا ہے، confused یا options compare کر رہا ہے۔',
    recommended_response: 'بالکل سر، آپ آرام سے سوچ لیں۔ اگر کوئی سوال ہو تو بتا دیں، میں مزید کلیئر کر دیتا ہوں تاکہ آپ کو فیصلہ کرنے میں آسانی ہو۔',
    alternative_response: 'سر کیا کوئی خاص چیز ہے جس پر آپ کنفیوز ہیں؟ شاید میں وہ ابھی کلیئر کر سکوں۔',
    do_not_say: 'جلدی کریں، آفر ختم ہو رہی ہے۔ (جھوٹی urgency create نہ کریں)',
    difficulty: 'beginner',
    status: 'published',
  },
  {
    objection_text: 'وارنٹی تحریری طور پر چاہیے۔',
    meaning: 'formal proof/documentation چاہتا ہے۔',
    recommended_response: 'سر ہماری وارنٹی پالیسی واضح ہے اور ہم واٹس ایپ پر بھی تمام ٹرمز لکھ کر دے دیتے ہیں۔ آپ وہ اپنے پاس رکھ سکتے ہیں۔',
    alternative_response: null,
    do_not_say: 'زبانی کافی ہے، لکھ کر نہیں دے سکتے۔',
    difficulty: 'beginner',
    status: 'published',
  },
  {
    objection_text: 'کیا یہ طریقہ لیگل ہے؟',
    meaning: 'legitimacy کے بارے میں فکرمند ہے۔',
    recommended_response: 'سر یہ گوگل کے آفیشل سبسکرپشن سسٹم کے ذریعے ہی ایکٹیویٹ ہوتا ہے، ہم صرف بلک میں حاصل کر کے بہتر پرائس پر آفر کرتے ہیں۔',
    alternative_response: null,
    do_not_say: 'کوئی بھی overconfident قانونی claim جو verify نہ ہو۔',
    difficulty: 'intermediate',
    status: 'published',
  },
  {
    objection_text: 'اگر پسند نہ آیا تو ریفنڈ ملے گا؟',
    meaning: 'exit option چاہتا ہے۔',
    recommended_response: 'سر ہماری گارنٹی واؤچر کلیم اور ابتدائی ایکٹیویشن تک محدود ہے۔ اگر ایکٹیویشن میں کوئی مسئلہ ہو تو ہم ریپلیسمنٹ دیتے ہیں۔',
    alternative_response: null,
    do_not_say: 'unconditional refund promise جو actual پالیسی نہ ہو۔',
    difficulty: 'intermediate',
    status: 'published',
  },
]

// ─── 4. SALES SCRIPTS ────────────────────────────────────────────────────────
const SCRIPTS = [
  {
    script_type: 'greeting',
    title: 'First Contact Greeting',
    content: 'Assalam o Alaikum! Google AI Pro (Gemini Advanced) mein interested hain? Main aapko complete details aur pricing bata sakta hoon, bas 2 minute lagenge 🙂',
    language: 'Roman Urdu',
    status: 'published',
  },
  {
    script_type: 'whatsapp',
    title: 'Detailed WhatsApp Intro',
    content: 'Sir, Google AI Pro ka plan 18 months ke liye available hai. Single User Rs. 499 aur Owner Account Rs. 999 mein hai. Isme aapko Gemini Advanced, Nano Banana, NotebookLM, Veo3 video generation, aur storage milti hai. Konsa option aapke liye zyada suitable rahega, ye bata dun?',
    language: 'Roman Urdu',
    status: 'published',
  },
  {
    script_type: 'follow_up',
    title: 'No-Response Follow-up',
    content: 'Sir just following up — koi sawal ho ya confusion ho to zaroor batayen, main help karne ke liye yahan hoon. Agar interested hain to activation 15 minute mein ho jata hai.',
    language: 'Roman Urdu',
    status: 'published',
  },
  {
    script_type: 'payment',
    title: 'Payment Reminder',
    content: 'Sir jab bhi ready hon, payment karke email share kar den, hum turant activation start kar denge. Advance payment policy hai, aap hamare customer reviews bhi check kar sakte hain tasalli ke liye.',
    language: 'Roman Urdu',
    status: 'published',
  },
  {
    script_type: 'closing',
    title: 'Closing Confirmation',
    content: 'Perfect sir! To confirm — aap [Single User / Owner Account] le rahe hain. Payment ke baad apni email share kar den, 5-15 minute mein access active ho jayega. Shukriya trust karne ke liye!',
    language: 'Roman Urdu',
    status: 'published',
  },
  {
    script_type: 'objection_response',
    title: 'Generic Objection Response Template',
    content: 'Samajh sakta hoon sir aapka concern. [Specific reassurance based on the objection]. Agar aur koi sawal ho to be-jhijhak puchen.',
    language: 'Roman Urdu',
    status: 'published',
  },
  {
    script_type: 'upsell',
    title: 'Single User → Owner Account Upsell',
    content: 'Sir agar aap heavy AI use karte hain — jaise video generation, content creation — to Owner Account zyada beneficial rahega, kyunki isme 5 additional Gmail slots aur zyada resources milte hain, sirf Rs. 500 zyada mein.',
    language: 'Roman Urdu',
    status: 'published',
  },
  {
    script_type: 'after_sales',
    title: 'After-Sales Check-in',
    content: 'Assalam o Alaikum sir! Aapka Google AI Pro access kaisa chal raha hai? Koi issue ho to turant batayen, hum yahan hain.',
    language: 'Roman Urdu',
    status: 'published',
  },
  {
    script_type: 'review_request',
    title: 'Review Request',
    content: 'Sir agar aap satisfied hain hamari service se, to ek chhota sa review de den — ye humein aur logon ki madad karne mein help karta hai. Bohot shukriya!',
    language: 'Roman Urdu',
    status: 'published',
  },
  {
    script_type: 'warranty_explanation',
    title: 'Warranty Explanation',
    content: 'Sir warranty ke baare mein clear kar dun — hum apni taraf se 18 months tak access remove nahi karte, ye hamari service warranty hai. Lekin Google ki taraf se koi policy change ho to wo hamare control mein nahi. Voucher issue ho to hum replacement dete hain guaranteed.',
    language: 'Roman Urdu',
    status: 'published',
  },
]

// ─── 5. CLIENT PSYCHOLOGY LESSON CONTENT ─────────────────────────────────────
const PSYCHOLOGY_TIPS = [
  {
    heading: 'Kam price par trust build karna',
    body: 'Customer jaldi trust nahi karta jab price bohat kam ho. Isliye social proof (reviews, existing customers) hamesha ready rakhein.',
  },
  {
    heading: 'Payment-first objection normal hai',
    body: 'Calmly explain karen, defensive na hon. Ye almost har customer poochta hai.',
  },
  {
    heading: 'Short messages, na ke long paragraphs',
    body: 'WhatsApp par short, broken messages zyada effective hain (jaisa voice notes ke structure mein hai).',
  },
  {
    heading: 'Voice notes trust build karte hain',
    body: 'Customer insaan ki awaaz sunta hai, sirf text nahi. Jahan mumkin ho voice note bhejein.',
  },
  {
    heading: 'Kabhi wo guarantee na den jo deliver na kar saken',
    body: 'Transparency (jaisa Voice Note 4 mein hai) long-term business banata hai, chhoti si jhooti guarantee reputation kharab kar sakti hai.',
  },
  {
    heading: '"Sochna hai" pe pressure na dalen',
    body: 'Genuine follow-up karen (1-2 din baad), jhooti urgency create na karen jab tak genuinely time-limited na ho.',
  },
  {
    heading: 'Frustrated customer ko pehle sunein, phir solve karen',
    body: 'Defensive response se masla aur bara hota hai.',
  },
  {
    heading: 'Upsell sirf tab karen jab need clear ho',
    body: 'Har customer ko forcefully Owner Account na bechein, sirf jinko heavy usage chahiye.',
  },
  {
    heading: 'Customer ko informed decision khud lene den',
    body: 'Options clearly bata den, decision unpar chhoren — isse trust aur badhta hai.',
  },
  {
    heading: 'After-sales follow-up karna repeat business laata hai',
    body: 'Ek dafa sale karke bhool na jayen, check-in karna referrals aur reviews laata hai.',
  },
]

// ─── MAIN ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n══════════════════════════════════════════════════════════════')
  console.log('   SALES ACADEMY — TRAINING CONTENT SEED')
  console.log('══════════════════════════════════════════════════════════════\n')

  // ── Step 1: Seed Voice Notes ────────────────────────────────────────────────
  console.log('── STEP 1: Seeding Voice Notes ──────────────────────────────')
  
  // Delete existing seeded voice notes to avoid duplicates
  await supabase.from('voice_notes').delete().in('title', VOICE_NOTES.map(v => v.title))
  
  const { data: vnData, error: vnError } = await supabase
    .from('voice_notes')
    .insert(VOICE_NOTES)
    .select('id, title')
  
  if (vnError) { err('Voice Notes insert: ' + vnError.message) }
  else { log(`  ✅ Inserted ${vnData?.length} voice notes`) }

  // ── Step 2: Seed FAQs ───────────────────────────────────────────────────────
  console.log('\n── STEP 2: Seeding FAQs ─────────────────────────────────────')
  
  await supabase.from('faqs').delete().in('question', FAQS.map(f => f.question))
  
  const { data: faqData, error: faqError } = await supabase
    .from('faqs')
    .insert(FAQS)
    .select('id, question')
  
  if (faqError) { err('FAQs insert: ' + faqError.message) }
  else { log(`  ✅ Inserted ${faqData?.length} FAQs`) }

  // ── Step 3: Seed Objections ─────────────────────────────────────────────────
  console.log('\n── STEP 3: Seeding Objections ───────────────────────────────')
  
  await supabase.from('objections').delete().in('objection_text', OBJECTIONS.map(o => o.objection_text))
  
  const { data: objData, error: objError } = await supabase
    .from('objections')
    .insert(OBJECTIONS)
    .select('id, objection_text')
  
  if (objError) { err('Objections insert: ' + objError.message) }
  else { log(`  ✅ Inserted ${objData?.length} objections`) }

  // ── Step 4: Seed Scripts ────────────────────────────────────────────────────
  console.log('\n── STEP 4: Seeding Scripts ──────────────────────────────────')
  
  await supabase.from('scripts').delete().in('title', SCRIPTS.map(s => s.title))
  
  const { data: scriptData, error: scriptError } = await supabase
    .from('scripts')
    .insert(SCRIPTS)
    .select('id, title')
  
  if (scriptError) { err('Scripts insert: ' + scriptError.message) }
  else { log(`  ✅ Inserted ${scriptData?.length} scripts`) }

  // ── Step 5: Seed Client Psychology Lesson ──────────────────────────────────
  console.log('\n── STEP 5: Seeding Client Psychology Lesson ─────────────────')
  
  // Find or create the course "Google AI Pro Sales Training"
  let courseId: string | null = null
  const { data: courses } = await supabase
    .from('courses')
    .select('id, title')
    .ilike('title', '%Google AI Pro%')
    .limit(1)
  
  if (courses && courses.length > 0) {
    courseId = courses[0].id
    log(`  ℹ️  Found existing course: "${courses[0].title}" (${courseId})`)
  } else {
    // Need an admin user to create a course — find first admin
    const { data: admins } = await supabase
      .from('profiles')
      .select('id')
      .eq('role', 'admin')
      .limit(1)
    
    if (!admins || admins.length === 0) {
      err('No admin user found — cannot create course. Create an admin account first.')
    } else {
      const { data: newCourse, error: courseErr } = await supabase
        .from('courses')
        .insert({
          title: 'Google AI Pro Sales Training',
          description: 'Complete training program for selling Google AI Pro (Gemini Advanced) plans. Covers product knowledge, objection handling, and sales psychology.',
          status: 'published',
          category: 'Sales Training',
          difficulty: 'beginner',
          created_by: admins[0].id,
        })
        .select('id, title')
        .single()
      
      if (courseErr) { err('Course create: ' + courseErr.message) }
      else {
        courseId = newCourse!.id
        log(`  ✅ Created course: "${newCourse!.title}" (${courseId})`)
      }
    }
  }

  if (!courseId) {
    err('Cannot proceed with lesson creation — no course available.')
  } else {
    // Find or create the "Sales Skills" module
    let moduleId: string | null = null
    const { data: modules } = await supabase
      .from('modules')
      .select('id, title')
      .eq('course_id', courseId)
      .ilike('title', '%Sales Skills%')
      .limit(1)
    
    if (modules && modules.length > 0) {
      moduleId = modules[0].id
      log(`  ℹ️  Found existing module: "${modules[0].title}" (${moduleId})`)
    } else {
      // Get max order_index for this course's modules
      const { data: allModules } = await supabase
        .from('modules')
        .select('order_index')
        .eq('course_id', courseId)
        .order('order_index', { ascending: false })
        .limit(1)
      
      const nextOrder = (allModules?.[0]?.order_index ?? -1) + 1
      
      const { data: newModule, error: moduleErr } = await supabase
        .from('modules')
        .insert({
          course_id: courseId,
          title: 'Sales Skills',
          description: 'Practical sales skills including objection handling, client psychology, and communication techniques.',
          order_index: nextOrder,
          status: 'published',
        })
        .select('id, title')
        .single()
      
      if (moduleErr) { err('Module create: ' + moduleErr.message) }
      else {
        moduleId = newModule!.id
        log(`  ✅ Created module: "${newModule!.title}" (${moduleId})`)
      }
    }

    if (!moduleId) {
      err('Cannot create lesson — no module available.')
    } else {
      // Create the lesson (delete existing if same title)
      await supabase
        .from('lessons')
        .delete()
        .eq('module_id', moduleId)
        .ilike('title', '%Client Psychology%')

      const { data: allLessons } = await supabase
        .from('lessons')
        .select('order_index')
        .eq('module_id', moduleId)
        .order('order_index', { ascending: false })
        .limit(1)
      
      const nextLessonOrder = (allLessons?.[0]?.order_index ?? -1) + 1

      const { data: newLesson, error: lessonErr } = await supabase
        .from('lessons')
        .insert({
          module_id: moduleId,
          title: 'Client Psychology & Objection Handling',
          description: 'Understand how customers think and how to handle common objections effectively.',
          order_index: nextLessonOrder,
          status: 'published',
          duration_minutes: 20,
        })
        .select('id, title')
        .single()
      
      if (lessonErr) { err('Lesson create: ' + lessonErr.message) }
      else {
        const lessonId = newLesson!.id
        log(`  ✅ Created lesson: "${newLesson!.title}" (${lessonId})`)
        
        // Create 20 content blocks (heading + text for each tip)
        const contentBlocks = []
        for (let i = 0; i < PSYCHOLOGY_TIPS.length; i++) {
          const tip = PSYCHOLOGY_TIPS[i]
          contentBlocks.push({
            lesson_id: lessonId,
            type: 'heading',
            content: { text: tip.heading, level: 3 },
            order_index: i * 2,
          })
          contentBlocks.push({
            lesson_id: lessonId,
            type: 'text',
            content: { text: tip.body },
            order_index: i * 2 + 1,
          })
        }
        
        const { data: cbData, error: cbErr } = await supabase
          .from('content_blocks')
          .insert(contentBlocks)
          .select('id')
        
        if (cbErr) { err('Content blocks insert: ' + cbErr.message) }
        else { log(`  ✅ Inserted ${cbData?.length} content blocks (${PSYCHOLOGY_TIPS.length} tips × 2)`) }
      }
    }
  }

  // ── VERIFICATION ────────────────────────────────────────────────────────────
  console.log('\n══════════════════════════════════════════════════════════════')
  console.log('   VERIFICATION')
  console.log('══════════════════════════════════════════════════════════════\n')

  const { count: vnCount } = await supabase.from('voice_notes').select('*', { count: 'exact', head: true }).eq('status', 'published')
  const { count: faqCount } = await supabase.from('faqs').select('*', { count: 'exact', head: true }).eq('status', 'published')
  const { count: objCount } = await supabase.from('objections').select('*', { count: 'exact', head: true }).eq('status', 'published')
  const { count: scriptCount } = await supabase.from('scripts').select('*', { count: 'exact', head: true }).eq('status', 'published')
  
  // Count content blocks for the psychology lesson
  const { data: psychLesson } = await supabase
    .from('lessons')
    .select('id')
    .ilike('title', '%Client Psychology%')
    .single()
  
  let cbCount = 0
  if (psychLesson) {
    const { count } = await supabase
      .from('content_blocks')
      .select('*', { count: 'exact', head: true })
      .eq('lesson_id', psychLesson.id)
    cbCount = count ?? 0
  }

  const checks = [
    { label: 'Voice Notes (published)', count: vnCount, expected: 4 },
    { label: 'FAQs (published)', count: faqCount, expected: 18 },
    { label: 'Objections (published)', count: objCount, expected: 8 },
    { label: 'Scripts (published)', count: scriptCount, expected: 10 },
    { label: 'Content blocks in Psychology lesson', count: cbCount, expected: 20 },
  ]

  let allPassed = true
  for (const c of checks) {
    if (c.count === c.expected) {
      log(`  ✅ ${c.label}: ${c.count} (expected ${c.expected})`)
    } else {
      log(`  ⚠️  ${c.label}: ${c.count} (expected ${c.expected}) — may include pre-existing rows`)
      // Don't fail if count >= expected (pre-existing data is fine)
      if ((c.count ?? 0) < c.expected) allPassed = false
    }
  }

  if (errors.length > 0) {
    console.log('\n  ERRORS:')
    errors.forEach(e => log('    ❌ ' + e))
    allPassed = false
  }

  console.log('\n══════════════════════════════════════════════════════════════')
  if (allPassed && errors.length === 0) {
    console.log('  🎉 ALL CONTENT SEEDED SUCCESSFULLY!\n')
    process.exit(0)
  } else {
    console.log('  ⚠️  SEEDING COMPLETED WITH SOME ISSUES — see above\n')
    process.exit(errors.length > 0 ? 1 : 0)
  }
}

main().catch(e => { console.error('Fatal:', e); process.exit(1) })
