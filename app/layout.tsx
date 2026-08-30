import type { Metadata } from 'next'
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
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  let role: 'admin' | 'salesman' = 'salesman'
  
  if (user) {
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role === 'admin') {
      role = 'admin'
    }
  }

  const theme = await fetchThemeSettings(role)

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeInjector theme={theme} />
        {children}
      </body>
    </html>
  )
}
