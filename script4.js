const fs = require('fs');
const p = 'c:/Users/DELL/Documents/antigravity/happy-bose/lib/actions/quizzes.ts';
let c = fs.readFileSync(p, 'utf8');
const ra = 
async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') throw new Error('Forbidden')
  return { supabase, user }
}
;
if (!c.includes('async function requireAdmin')) {
    c = c.replace("import { ActionResult", ra + "\nimport { ActionResult");
    fs.writeFileSync(p, c);
}
