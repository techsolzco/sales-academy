'use client'

import { useState } from 'react'
import { Plus, X, Loader2, UserPlus, Shield } from 'lucide-react'
import { createUser } from '@/lib/actions/users'
import { useRouter } from 'next/navigation'

export function CreateUserModal() {
  const [isOpen, setIsOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // B17: the generated temp password is returned by createUser and shown
  // once here so the admin can share it — it is never emailed automatically.
  const [createdPassword, setCreatedPassword] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const router = useRouter()

  const closeModal = () => {
    setIsOpen(false)
    setCreatedPassword(null)
    setCopied(false)
    setError(null)
    setFormData({ fullName: '', email: '', password: '', role: 'salesman', phone: '' })
  }

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    role: 'salesman' as 'admin' | 'salesman',
    phone: ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)

    const res = await createUser(formData)
    setIsSubmitting(false)

    if (res.error) {
      setError(res.error)
    } else if ((res as any).data?.tempPassword) {
      // B17: show the temp password once so the admin can share it with
      // the new user — keep the modal open instead of closing silently.
      setCreatedPassword((res as any).data.tempPassword)
      router.refresh()
    } else {
      closeModal()
      router.refresh()
    }
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 bg-brand-600 text-white px-4 py-2.5 rounded-xl font-medium hover:bg-brand-700 transition"
      >
        <UserPlus className="w-4 h-4" />
        <span className="hidden sm:inline">Add User</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-gray-800 rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md shadow-xl overflow-hidden max-h-[92vh] overflow-y-auto">
            <div className="p-5 sm:p-6 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Add New User</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Create an admin or salesman account manually</p>
              </div>
              <button onClick={closeModal} className="text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 p-2 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            {createdPassword ? (
              <div className="p-6 space-y-4">
                <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl">
                  <p className="text-sm font-medium text-green-800 dark:text-green-300">User created successfully</p>
                  <p className="text-sm text-green-700 dark:text-green-400 mt-1">Share this temporary password with the new user — it is shown only once.</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Temporary password</label>
                  <div className="flex gap-2">
                    <input readOnly value={createdPassword} onFocus={e => e.target.select()} className="flex-1 px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 font-mono text-sm outline-none" />
                    <button type="button" onClick={async () => { await navigator.clipboard.writeText(createdPassword); setCopied(true) }} className="px-4 py-2 bg-brand-600 text-white text-sm font-medium rounded-xl hover:bg-brand-700 transition">{copied ? 'Copied' : 'Copy'}</button>
                  </div>
                </div>
                <div className="pt-2 flex justify-end">
                  <button type="button" onClick={closeModal} className="px-5 py-2.5 bg-brand-600 text-white font-medium rounded-xl hover:bg-brand-700 transition">Done</button>
                </div>
              </div>
            ) : (
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && (
                <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm border border-red-100">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                <input
                  required
                  type="text"
                  value={formData.fullName}
                  onChange={e => setFormData({ ...formData, fullName: e.target.value })}
                  className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none"
                  placeholder="e.g. John Doe"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email Address *</label>
                <input
                  required
                  type="email"
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none"
                  placeholder="john@example.com"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Role *</label>
                  <select
                    value={formData.role}
                    onChange={e => setFormData({ ...formData, role: e.target.value as 'admin' | 'salesman' })}
                    className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none"
                  >
                    <option value="salesman">Salesman</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none"
                    placeholder="+92..."
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <input
                  type="text"
                  value={formData.password}
                  onChange={e => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none"
                  placeholder="Leave blank to auto-generate a secure password"
                />
                <p className="text-xs text-gray-500 mt-1">If blank, a secure random temporary password is generated and shown to you after creation.</p>
              </div>

              <div className="pt-4 border-t border-gray-100 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-5 py-2.5 text-gray-600 font-medium hover:bg-gray-100 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 bg-brand-600 text-white font-medium rounded-xl hover:bg-brand-700 transition disabled:opacity-50 flex items-center gap-2"
                >
                  {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  Create User
                </button>
              </div>
            </form>)}
          </div>
        </div>
      )}
    </>
  )
}
