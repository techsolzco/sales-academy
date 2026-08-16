'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Edit, Trash2, Megaphone, Loader2, Paperclip, Eye, EyeOff } from 'lucide-react'
import { createAnnouncement, updateAnnouncement, deleteAnnouncement } from '@/lib/actions/announcements'
import type { Announcement } from '@/lib/actions/announcements'
import { ImageUpload } from '@/components/ui/ImageUpload'

type FormState = {
  title: string
  body: string
  attachment_url: string
  attachment_name: string
  target_role: 'all' | 'salesman' | 'admin'
}

const defaultForm: FormState = {
  title: '',
  body: '',
  attachment_url: '',
  attachment_name: '',
  target_role: 'all',
}

export function AnnouncementManager({ initialAnnouncements }: { initialAnnouncements: Announcement[] }) {
  const router = useRouter()
  const [announcements, setAnnouncements] = useState(initialAnnouncements)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(defaultForm)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function openCreate() {
    setEditingId(null)
    setForm(defaultForm)
    setIsFormOpen(true)
    setError(null)
  }

  function openEdit(a: Announcement) {
    setEditingId(a.id)
    setForm({
      title: a.title,
      body: a.body,
      attachment_url: a.attachment_url || '',
      attachment_name: a.attachment_name || '',
      target_role: a.target_role,
    })
    setIsFormOpen(true)
    setError(null)
  }

  function handleCancel() {
    setIsFormOpen(false)
    setEditingId(null)
    setError(null)
  }

  function handleSave() {
    if (!form.title.trim() || !form.body.trim()) {
      setError('Title and body are required.')
      return
    }
    setError(null)
    startTransition(async () => {
      const payload = {
        title: form.title,
        body: form.body,
        attachment_url: form.attachment_url || null,
        attachment_name: form.attachment_name || null,
        target_role: form.target_role,
      }
      let res
      if (editingId) {
        res = await updateAnnouncement(editingId, payload)
      } else {
        res = await createAnnouncement(payload)
      }
      if (res.error) { setError(res.error); return }
      router.refresh()
      handleCancel()
    })
  }

  function handleDelete(id: string) {
    if (!confirm('Delete this announcement?')) return
    startTransition(async () => {
      await deleteAnnouncement(id)
      setAnnouncements(prev => prev.filter(a => a.id !== id))
      router.refresh()
    })
  }

  function handleTogglePublish(a: Announcement) {
    startTransition(async () => {
      await updateAnnouncement(a.id, { is_published: !a.is_published })
      setAnnouncements(prev => prev.map(x => x.id === a.id ? { ...x, is_published: !x.is_published } : x))
      router.refresh()
    })
  }

  const inputCls = 'w-full px-3 py-2.5 border border-gray-200 dark:border-gray-600 dark:bg-gray-900 dark:text-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-400'

  return (
    <div className="space-y-4">
      {/* Form */}
      {isFormOpen && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 space-y-4">
          <h2 className="font-semibold text-gray-900 dark:text-white">{editingId ? 'Edit Announcement' : 'New Announcement'}</h2>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Title</label>
            <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className={inputCls} placeholder="e.g. New Policy Update" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Message</label>
            <textarea rows={5} value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value }))} className={`${inputCls} resize-none`} placeholder="Write the announcement message..." />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Audience</label>
            <select value={form.target_role} onChange={e => setForm(f => ({ ...f, target_role: e.target.value as any }))} className={inputCls}>
              <option value="all">Everyone</option>
              <option value="salesman">Salesmen Only</option>
              <option value="admin">Admins Only</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              <Paperclip className="w-3.5 h-3.5 inline mr-1" />
              Attachment (optional — image or file URL)
            </label>
            <input
              value={form.attachment_url}
              onChange={e => setForm(f => ({ ...f, attachment_url: e.target.value }))}
              className={inputCls}
              placeholder="https://... or upload below"
            />
            <div className="mt-2">
              <ImageUpload
                bucket="announcements"
                onUpload={(url: string) => {
                  const name = url.split('/').pop() || 'attachment'
                  setForm(f => ({ ...f, attachment_url: url, attachment_name: name }))
                }}
              />
            </div>
            {form.attachment_url && (
              <input
                value={form.attachment_name}
                onChange={e => setForm(f => ({ ...f, attachment_name: e.target.value }))}
                className={`${inputCls} mt-2`}
                placeholder="Attachment display name (e.g. 'Q3 Policy.pdf')"
              />
            )}
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={handleCancel} className="px-4 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">Cancel</button>
            <button onClick={handleSave} disabled={isPending} className="px-5 py-2 text-sm rounded-xl bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-60 flex items-center gap-2">
              {isPending && <Loader2 className="w-3 h-3 animate-spin" />}
              {editingId ? 'Update' : 'Publish'} Announcement
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-500 dark:text-gray-400">{announcements.length} announcement{announcements.length !== 1 ? 's' : ''}</p>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white text-sm rounded-xl font-medium hover:bg-brand-700">
          <Plus className="w-4 h-4" /> New Announcement
        </button>
      </div>

      {/* List */}
      {announcements.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700 p-12 text-center">
          <Megaphone className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">No announcements yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {announcements.map(a => (
            <div key={a.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h3 className="font-semibold text-gray-900 dark:text-white">{a.title}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${a.is_published ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'}`}>
                      {a.is_published ? 'Published' : 'Draft'}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-brand-100 text-brand-700 font-medium">{a.target_role}</span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2">{a.body}</p>
                  {a.attachment_url && (
                    <a href={a.attachment_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 mt-2 text-xs text-brand-600 hover:underline">
                      <Paperclip className="w-3 h-3" />
                      {a.attachment_name || 'View Attachment'}
                    </a>
                  )}
                  <p className="text-xs text-gray-400 mt-2">{new Date(a.created_at).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button onClick={() => handleTogglePublish(a)} title={a.is_published ? 'Unpublish' : 'Publish'} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500">
                    {a.is_published ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                  <button onClick={() => openEdit(a)} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500">
                    <Edit className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(a.id)} className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
