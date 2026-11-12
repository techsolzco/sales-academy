'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath, unstable_cache } from 'next/cache'
import { ThemeSettings } from '@/types'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')
  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') throw new Error('Forbidden')
  return { supabase, user }
}

// S13: gradient_css / sidebar_gradient_css are interpolated raw into a
// <style> block (components/layout/ThemeInjector.tsx). Only gradient
// functions with plain colour stops may be stored — anything that could
// break out of the style element or inject extra declarations is rejected.
// Legit values in lib/theme-presets.ts use linear-/radial-gradient() with
// hex, rgb()/rgba(), hsl(), 'transparent', deg/%, 'to …', 'ellipse … at …'.
const ALLOWED_GRADIENT_FNS = new Set(['linear-gradient', 'radial-gradient', 'rgb', 'rgba', 'hsl', 'hsla'])

function isValidGradient(value: string): boolean {
  const v = value.trim()
  if (!v) return false
  const lower = v.toLowerCase()
  for (const bad of ['<', '>', 'url(', 'expression(', '</style', ';', '{', '}', '"', "'", '`', '\\', 'javascript:', 'data:', '@import']) {
    if (lower.includes(bad)) return false
  }
  if (!/^[a-z0-9\s.,%#()\-+]+$/i.test(v)) return false
  if (!/^(linear-gradient|radial-gradient)\(/.test(lower)) return false
  // Balanced parentheses, and every function used must be an allowed one.
  let depth = 0
  for (const ch of v) {
    if (ch === '(') depth++
    if (ch === ')') { depth--; if (depth < 0) return false }
  }
  if (depth !== 0) return false
  for (const m of Array.from(v.matchAll(/([a-z][a-z0-9\-]*)\s*\(/gi))) {
    if (!ALLOWED_GRADIENT_FNS.has(m[1].toLowerCase())) return false
  }
  // After stripping all (...) groups, only gradient fn names separated by
  // commas may remain (covers comma-separated multi-gradient values).
  let stripped = v
  let prev = ''
  while (stripped !== prev) { prev = stripped; stripped = stripped.replace(/\([^()]*\)/g, '') }
  const parts = stripped.split(',').map(s => s.trim()).filter(Boolean)
  return parts.length > 0 && parts.every(p => p === 'linear-gradient' || p === 'radial-gradient')
}

function isValidWallpaperUrl(value: string): boolean {
  try {
    const u = new URL(value.trim())
    return u.protocol === 'https:'
  } catch {
    return false
  }
}

async function getThemeFromDb(portal: 'admin' | 'salesman'): Promise<ThemeSettings | null> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('theme_settings')
      .select('*')
      .eq('portal', portal)
      .maybeSingle()

    if (error) {
      console.error('Error fetching theme settings:', error)
      return null
    }

    return data
  } catch (err) {
    console.error('Exception fetching theme settings:', err)
    return null
  }
}

// Deliberately NO auth check: app/layout.tsx calls this for anonymous
// visitors too (login page render picks the salesman theme when logged
// out). The write path above is admin-gated and the values are validated.
export const fetchThemeSettings = unstable_cache(
  async (portal: 'admin' | 'salesman') => getThemeFromDb(portal),
  ['theme_settings_cache'],
  { revalidate: 3600, tags: ['theme_settings'] }
)

export async function updateThemeSettings(portal: 'admin' | 'salesman', data: Partial<ThemeSettings>) {
  try {
    const { supabase } = await requireAdmin()

    if (data.gradient_css != null && data.gradient_css !== '' && !isValidGradient(data.gradient_css)) {
      return { success: false, error: 'Invalid gradient_css: only linear-gradient()/radial-gradient() with plain colours are allowed' }
    }
    if (data.sidebar_gradient_css != null && data.sidebar_gradient_css !== '' && !isValidGradient(data.sidebar_gradient_css)) {
      return { success: false, error: 'Invalid sidebar_gradient_css: only linear-gradient()/radial-gradient() with plain colours are allowed' }
    }
    if (data.wallpaper_url != null && data.wallpaper_url !== '' && !isValidWallpaperUrl(data.wallpaper_url)) {
      return { success: false, error: 'Invalid wallpaper_url: must be an https:// URL' }
    }

    const { error } = await supabase
      .from('theme_settings')
      .update({
          primary_color: data.primary_color,
          accent_color: data.accent_color,
          theme_mode: data.theme_mode,
          theme_preset: data.theme_preset ?? 'custom',
          gradient_css: data.gradient_css ?? null,
          sidebar_gradient_css: data.sidebar_gradient_css ?? null,
          wallpaper_url: data.wallpaper_url ?? null,
          wallpaper_opacity: data.wallpaper_opacity ?? 0.15,
          card_opacity: data.card_opacity ?? 1.0,
          updated_at: new Date().toISOString()
      })
      .eq('portal', portal)

    if (error) {
      console.error('Error updating theme settings:', error)
      return { success: false, error: error.message }
    }

    revalidatePath('/', 'layout')
    return { success: true }
  } catch (err: any) {
    console.error('Exception updating theme settings:', err)
    return { success: false, error: err?.message || 'Failed to update theme' }
  }
}
