import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export interface EffectiveUser {
  userId: string
  realUserId: string
  isImpersonating: boolean
  profile: { full_name: string | null; email: string | null; role: string | null } | null
}

export async function getEffectiveUser(): Promise<EffectiveUser> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const cookieStore = await cookies()
  const viewAsUserId = cookieStore.get('view_as_user_id')?.value

  const { data: realProfile } = await supabase
    .from('profiles')
    .select('role, full_name, email')
    .eq('id', user.id)
    .single()

  const isAdmin = realProfile?.role === 'admin'
  const isImpersonating = isAdmin && !!viewAsUserId

  if (isImpersonating && viewAsUserId) {
    const sb = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )
    const { data: studentProfile } = await sb
      .from('profiles')
      .select('full_name, email, role')
      .eq('id', viewAsUserId)
      .single()

    return { userId: viewAsUserId, realUserId: user.id, isImpersonating: true, profile: studentProfile ?? null }
  }

  return { userId: user.id, realUserId: user.id, isImpersonating: false, profile: realProfile ?? null }
}
