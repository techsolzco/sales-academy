import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

/**
 * Root route: fallback redirect based on auth state and user role.
 * In practice, middleware.ts handles this redirect directly at the Edge.
 */
export default async function HomePage() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }))

    if (!user) {
      redirect('/auth/login')
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()

    if (profile?.role === 'admin') {
      redirect('/admin')
    }

    redirect('/dashboard')
  } catch (error: any) {
    if (error?.digest?.startsWith('NEXT_REDIRECT') || error?.message === 'NEXT_REDIRECT') {
      throw error
    }
    console.error('[HomePage] Fallback error, redirecting to login:', error)
    redirect('/auth/login')
  }
}
