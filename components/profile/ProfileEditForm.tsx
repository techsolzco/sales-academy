'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { updateProfile } from '@/lib/actions/profile'
import { Save, Loader2 } from 'lucide-react'

interface Props {
  initialData: {
    full_name: string | null
    bio: string | null
    phone: string | null
  }
}

export function ProfileEditForm({ initialData }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    full_name: initialData.full_name || '',
    bio: initialData.bio || '',
    phone: initialData.phone || '',
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSaved(false)
    startTransition(async () => {
      const res = await updateProfile({
        full_name: form.full_name || undefined,
        bio: form.bio || undefined,
        phone: form.phone || undefined,
      })
      if (res.error) { setError(res.error); return }
      setSaved(true)
      router.refresh()
      setTimeout(() => setSaved(false), 3000)
    })
  }

  const inputCls = 'w-full px-3 py-2.5 border border-gray-200 dark:border-gray-600 dark:bg-gray-900 dark:text-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-400'

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-6">
      <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-5">Edit Profile</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <p className="text-sm text-red-500">{error}</p>}
        {saved && <p className="text-sm text-emerald-600 font-medium">✓ Profile saved successfully!</p>}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Display Name</label>
          <input value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} className={inputCls} placeholder="Your full name" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Bio / Tagline</label>
          <textarea rows={3} value={form.bio} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))} className={`${inputCls} resize-none`} placeholder="Tell us a little about yourself..." />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Phone Number</label>
          <input type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className={inputCls} placeholder="e.g. +92 300 1234567" />
        </div>
        <div className="flex justify-end">
          <button type="submit" disabled={isPending} className="flex items-center gap-2 px-5 py-2.5 bg-brand-600 text-white rounded-xl font-medium hover:bg-brand-700 disabled:opacity-60 transition">
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {isPending ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  )
}
