'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { LogOut } from 'lucide-react'

export function SignOutButton() {
  const router = useRouter()
  const supabase = createClient()

  async function handleSignOut() {
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
