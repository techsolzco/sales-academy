'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Edit, Trash2, Eye, EyeOff, Loader2 } from 'lucide-react'
import { createPolicy, updatePolicy, deletePolicy } from '@/lib/actions/policies'
import type { Policy } from '@/lib/actions/policies'

export function PolicyManager({ initialPolicies }: { initialPolicies: Policy[] }) {
  const router = useRouter()
  const [policies, setPolicies] = useState(initialPolicies)
  const [isCreating, setIsCreating] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({ title: '', content: '' })
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function openCreate() {
    setEditingId(null)
    setForm({ title: '', content: '' })
    setIsCreating(true)
  }

  function openEdit(p: Policy) {
    setIsCreating(false)
    setEditingId(p.id)
    setForm({ title: p.title, content: p.content })
  }

  function handleCancel() {
    setIsCreating(false)
    setEditingId(null)
    setError(null)
  }

  function handleSave() {
    if (!form.title.trim() || !form.content.trim()) { setError('Title and content are required.'); return }
    setError(null)
    startTransition(async () => {
      let res
      if (editingId) {
        const existing = policies.find(p => p.id === editingId)!
        res = await updatePolicy(editingId, form.title, form.content, existing.is_published)
      } else {
        res = await createPolicy(form.title, form.content)
      }
      if (res.error) { setError(res.error); return }
      router.refresh()
      handleCancel()
    })
  }

  function handleDelete(id: string) {
    if (!confirm('Delete this policy?')) return
    startTransition(async () => {
      await deletePolicy(id)
      setPolicies(prev => prev.filter(p => p.id !== id))
      router.refresh()
    })
  }

  function handleTogglePublish(p: Policy) {
    startTransition(async () => {
      await updatePolicy(p.id, p.title, p.content, !p.is_published)
      setPolicies(prev => prev.map(x => x.id === p.id ? { ...x, is_published: !x.is_published } : x))
      router.refresh()
    })
  }

  const inputCls = 'w-full px-3 py-2 border border-gray-200 dark:border-gray-600 dark:bg-gray-900 dark:text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-400'

  return (
    <div className="space-y-4">
      {/* Create / Edit Form */}
      {(isCreating || editingId) && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 space-y-4">
          <h2 className="font-semibold text-gray-900 dark:text-white">{editingId ? 'Edit Policy' : 'New Policy'}</h2>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title</label>
            <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className={inputCls} placeholder="e.g. Code of Conduct" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Content</label>
            <textarea rows={8} value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} className={`${inputCls} resize-none`} placeholder="Write the policy content here..." />
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={handleCancel} className="px-4 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">Cancel</button>
            <button onClick={handleSave} disabled={isPending} className="px-4 py-2 text-sm rounded-lg bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-60 flex items-center gap-2">
              {isPending && <Loader2 className="w-3 h-3 animate-spin" />}
              Save Policy
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-500 dark:text-gray-400">{policies.length} {policies.length === 1 ? 'policy' : 'policies'}</p>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white text-sm rounded-xl font-medium hover:bg-brand-700">
          <Plus className="w-4 h-4" /> New Policy
        </button>
      </div>

      {/* Policy List */}
      {policies.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700 p-12 text-center">
          <p className="text-gray-400 text-sm">No policies yet. Create your first policy.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {policies.map(p => (
            <div key={p.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-5 flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-gray-900 dark:text-white truncate">{p.title}</h3>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${p.is_published ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'}`}>
                    {p.is_published ? 'Published' : 'Draft'}
                  </span>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">{p.content}</p>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button onClick={() => handleTogglePublish(p)} title={p.is_published ? 'Unpublish' : 'Publish'} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400">
                  {p.is_published ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
                <button onClick={() => openEdit(p)} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400">
                  <Edit className="w-4 h-4" />
                </button>
                <button onClick={() => handleDelete(p.id)} className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
