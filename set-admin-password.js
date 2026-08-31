/**
 * One-time admin password reset script.
 * Run: node set-admin-password.js
 * Fill in YOUR_NEW_PASSWORD below before running.
 */
const fs = require('fs');
const https = require('https');

// ─── CONFIG ──────────────────────────────────────────────────────────────────
const USER_ID = '9ab2b5d4-e912-4609-b5ba-bc92da398607';
const NEW_PASSWORD = 'YOUR_NEW_PASSWORD_HERE'; // ← Replace this
// ─────────────────────────────────────────────────────────────────────────────

if (NEW_PASSWORD === 'YOUR_NEW_PASSWORD_HERE') {
  console.error('❌ Fill in NEW_PASSWORD before running this script!');
  process.exit(1);
}

const env = fs.readFileSync('.env.local', 'utf8').split('\n').reduce((a, l) => {
  const m = l.match(/^([^#=]+)=(.*)/);
  if (m) a[m[1].trim()] = m[2].trim();
  return a;
}, {});

const url = new URL(`${env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/admin/users/${USER_ID}`);
const body = JSON.stringify({ password: NEW_PASSWORD });

const options = {
  hostname: url.hostname,
  path: url.pathname,
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body),
    'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
    'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
  },
};

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', (c) => (data += c));
  res.on('end', () => {
    if (res.statusCode === 200) {
      console.log('✅ Password updated successfully for techsolzco@gmail.com');
      console.log('   You can now log in at /auth/login with the new password.');
    } else {
      console.error('❌ Failed:', res.statusCode, data);
    }
  });
});
req.on('error', (e) => console.error('❌ Error:', e.message));
req.write(body);
req.end();
