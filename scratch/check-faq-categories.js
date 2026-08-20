const fs = require('fs')
const path = require('path')
const envPath = path.join(__dirname, '../.env.local')
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8')
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/)
    if (match) process.env[match[1].trim()] = match[2].trim()
  })
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
const allowed = ['Pricing','Product','Warranty','General','Technical','Comparison','Payment','Privacy','Delivery','Features','Policy','Usage','Support','Audience','Guideline']

async function main() {
  const filter = allowed.map(c => c).join(',')
  const res = await fetch(`${url}/rest/v1/faqs?select=id,question,category,tool_id&category=not.in.(${filter})`, {
    headers: {
      'apikey': key,
      'Authorization': `Bearer ${key}`
    }
  })
  const data = await res.json()
  console.log('FAQs with out-of-list categories:', JSON.stringify(data, null, 2))
}
main().catch(console.error)
