'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { ThemeSettings } from '@/types'

export async function fetchThemeSettings(portal: 'admin' | 'salesman'): Promise<ThemeSettings | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('theme_settings')
    .select('*')
    .eq('portal', portal)
    .single()

  if (error) {
    console.error('Error fetching theme settings:', error)
    return null
  }

  return data
}

export async function updateThemeSettings(portal: 'admin' | 'salesman', data: Partial<ThemeSettings>) {
  const supabase = await createClient()

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
}

export async function uploadThemeWallpaper(formData: FormData): Promise<{ url: string } | { error: string }> {
  const supabase = await createClient()

  const file = formData.get('file') as File
  if (!file) return { error: 'No file provided' }
  if (!file.type.startsWith('image/')) return { error: 'File must be an image' }
  if (file.size > 5 * 1024 * 1024) return { error: 'Image must be under 5MB' }

  const ext = file.name.split('.').pop() || 'jpg'
  const fileName = `wallpaper-${Date.now()}.${ext}`

  const { error: uploadError } = await supabase.storage
    .from('theme-wallpapers')
    .upload(fileName, file, { upsert: true, contentType: file.type })

  if (uploadError) {
    console.error('Wallpaper upload error:', uploadError)
    return { error: uploadError.message }
  }

  const { data } = supabase.storage.from('theme-wallpapers').getPublicUrl(fileName)
  return { url: data.publicUrl }
}
