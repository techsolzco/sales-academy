import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

/**
 * Root route: redirect based on auth state and user role.
 */
export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role === 'admin') {
    redirect('/admin')
  }

  redirect('/dashboard')
}
