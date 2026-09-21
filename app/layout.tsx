import type { Metadata, Viewport } from 'next'

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}
import { SITE_NAME } from '@/lib/config/site'
import { Inter } from 'next/font/google'
import './globals.css'
import { createClient } from '@/lib/supabase/server'
import { fetchThemeSettings } from '@/lib/actions/theme'
import { ThemeInjector } from '@/components/layout/ThemeInjector'

// Always fetch fresh theme from DB on every request so saved colors apply immediately
export const dynamic = 'force-dynamic'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: SITE_NAME,
  description: 'Empower your sales team with structured learning.',
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  let role: 'admin' | 'salesman' = 'salesman'
  let theme = null

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }))
    
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle()

      if (profile?.role === 'admin') {
        role = 'admin'
      }
    }

    theme = await fetchThemeSettings(role)
  } catch (error) {
    console.error('[RootLayout] Error fetching theme or user:', error)
  }

  const isCosmic = theme?.theme_preset?.startsWith('cosmic-') || theme?.theme_preset === 'galaxy'
  const isDark = theme?.theme_mode === 'dark' || isCosmic

  const rootClasses = [isDark ? 'dark' : '', isCosmic ? 'galaxy-theme' : ''].filter(Boolean).join(' ')

  return (
    <html lang="en" className={rootClasses} suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeInjector theme={theme} />
        {children}
      </body>
    </html>
  )
}
