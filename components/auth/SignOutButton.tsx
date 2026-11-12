'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { stopViewAsStudent } from '@/lib/actions/view-as-student'
import { LogOut } from 'lucide-react'

export function SignOutButton() {
  const router = useRouter()
  const supabase = createClient()

  async function handleSignOut() {
    // B76 — clear the impersonation cookie BEFORE signing out, while
    // the session is still live (stopViewAsStudent now requires one).
    // Without this, the 2h view_as_user_id cookie survived sign-out and
    // a second admin on the same browser inherited the impersonation.
    // Sign-out itself proceeds even if the cookie clear fails.
    try {
      await stopViewAsStudent()
    } catch {
      // Non-fatal: still sign out below.
    }
    await supabase.auth.signOut()
    router.push('/auth/login')
    router.refresh()
  }

  return (
    <button
      id="btn-sign-out"
      onClick={handleSignOut}
      className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-brand-300 hover:bg-brand-800 hover:text-white transition-all"
    >
      <LogOut className="w-4 h-4 flex-shrink-0" />
      Sign out
    </button>
  )
}
