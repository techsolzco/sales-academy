# Deployment Checklist — Switching to a New Subdomain

Follow these steps **in order** when pointing this portal at a new subdomain.

---

## 1. Hosting panel (Hostinger)

- [ ] Add the new subdomain (e.g. `portal.example.com`) in the Hostinger control panel
- [ ] Point DNS: CNAME / A record → Hostinger server IP
- [ ] Enable SSL/TLS for the new subdomain (Let's Encrypt — usually 1-click in Hostinger)
- [ ] Update the Node.js app's "Domain" binding in Hostinger → Node.js → your app → Settings

---

## 2. Environment variables (Hostinger → Node.js → Environment Variables)

Update **only** these vars — no code changes needed:

```env
# Branding
NEXT_PUBLIC_SITE_NAME=Sales Academy          # or whatever you want to call it
NEXT_PUBLIC_SITE_TAGLINE=Elevate your sales performance
NEXT_PUBLIC_SITE_URL=https://portal.example.com   # ← new subdomain
NEXT_PUBLIC_SUPPORT_WHATSAPP=923107902212         # digits only

# Supabase (unchanged unless you also moved the Supabase project)
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
GEMINI_API_KEY=...
```

---

## 3. Supabase Auth — allowed origins & redirect URLs

Go to **Supabase Dashboard → Authentication → URL Configuration** and update:

- **Site URL**: `https://portal.example.com`
- **Redirect URLs** — add: `https://portal.example.com/**`
  (keep the old domain in the list during transition so existing sessions don't break)

---

## 4. Supabase Auth — email templates

Go to **Supabase Dashboard → Authentication → Email Templates** and check:

- Confirmation email (magic link / password reset) — update any hardcoded domain in the template body if you customized it

---

## 5. After go-live

- [ ] Test login / registration flow end-to-end on the new subdomain
- [ ] Test email confirmation link redirects correctly
- [ ] Remove the old subdomain from Supabase redirect URLs list (after all users have migrated)
- [ ] Update `NEXT_PUBLIC_SITE_URL` in Hostinger env vars if you hadn't yet

---

## What does NOT need to change

- Database schema, tables, RLS policies — completely unaffected
- GitHub repo name / URL — unaffected
- Supabase project ref / service role key — unaffected (unless you move projects)
- Any code files — all branding now comes from env vars via `lib/config/site.ts`
