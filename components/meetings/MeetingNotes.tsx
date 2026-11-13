'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  addMeetingNote,
  addActionItem,
  toggleActionItem,
  type MeetingNote,
  type MeetingActionItem,
} from '@/lib/actions/meetings'

export function MeetingNotes({
  meetingId,
  notes,
  actionItems,
  isAdmin,
  currentUserId,
  assignees,
}: {
  meetingId: string
  notes: MeetingNote[]
  actionItems: MeetingActionItem[]
  isAdmin: boolean
  currentUserId: string
  assignees?: { id: string; full_name: string | null }[]
}) {
  const router = useRouter()
  const [noteBody, setNoteBody] = useState('')
  const [noteBusy, setNoteBusy] = useState(false)
  const [itemTitle, setItemTitle] = useState('')
  const [itemAssignee, setItemAssignee] = useState('')
  const [itemDueDate, setItemDueDate] = useState('')
  const [itemBusy, setItemBusy] = useState(false)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleAddNote(e: React.FormEvent) {
    e.preventDefault()
    if (!noteBody.trim()) return
    setNoteBusy(true)
    setError(null)
    try {
      const res = await addMeetingNote(meetingId, noteBody)
      if (res.error) {
        setError(res.error)
      } else {
        setNoteBody('')
        router.refresh()
      }
    } catch (err: any) {
      setError(err.message || 'Failed to add note')
    } finally {
      setNoteBusy(false)
    }
  }

  async function handleAddItem(e: React.FormEvent) {
    e.preventDefault()
    if (!itemTitle.trim()) return
    setItemBusy(true)
    setError(null)
    try {
      const res = await addActionItem(meetingId, {
        title: itemTitle,
        assignee_id: itemAssignee || undefined,
        due_date: itemDueDate || undefined,
      })
      if (res.error) {
        setError(res.error)
      } else {
        setItemTitle('')
        setItemAssignee('')
        setItemDueDate('')
        router.refresh()
      }
    } catch (err: any) {
      setError(err.message || 'Failed to add action item')
    } finally {
      setItemBusy(false)
    }
  }

  async function handleToggle(item: MeetingActionItem) {
    setTogglingId(item.id)
    setError(null)
    try {
      const res = await toggleActionItem(item.id, !item.done)
      if (res.error) {
        setError(res.error)
      } else {
        router.refresh()
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update action item')
    } finally {
      setTogglingId(null)
    }
  }

  return (
    <div className="space-y-8">
      {error && (
        <p className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/50 rounded-xl px-4 py-2">{error}</p>
      )}

      <section>
        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">Meeting Notes</h2>
        {isAdmin && (
          <form onSubmit={handleAddNote} className="mb-4">
            <textarea
              value={noteBody}
              onChange={e => setNoteBody(e.target.value)}
              rows={3}
              placeholder="Write a note about this meeting…"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <div className="flex justify-end mt-2">
              <button
                type="submit"
                disabled={noteBusy || !noteBody.trim()}
                className="px-4 py-2 rounded-xl bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 transition disabled:opacity-50"
              >
                {noteBusy ? 'Adding…' : 'Add Note'}
              </button>
            </div>
          </form>
        )}
        {notes.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400 text-sm">No notes yet.</p>
        ) : (
          <ul className="space-y-3">
            {notes.map(note => (
              <li key={note.id} className="p-4 rounded-xl border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {note.author?.full_name ?? 'Unknown'}
                  </span>
                  <span className="text-xs text-gray-400 dark:text-gray-500">
                    {new Date(note.created_at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                  </span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap">{note.body}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">Action Items</h2>
        {isAdmin && (
          <form onSubmit={handleAddItem} className="mb-4 space-y-2">
            <input
              type="text"
              value={itemTitle}
              onChange={e => setItemTitle(e.target.value)}
              placeholder="New action item…"
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <div className="flex flex-col sm:flex-row gap-2">
              {assignees && assignees.length > 0 && (
                <select
                  value={itemAssignee}
                  onChange={e => setItemAssignee(e.target.value)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="">Unassigned</option>
                  {assignees.map(a => (
                    <option key={a.id} value={a.id}>{a.full_name ?? a.id}</option>
                  ))}
                </select>
              )}
              <input
                type="date"
                value={itemDueDate}
                onChange={e => setItemDueDate(e.target.value)}
                className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
              <button
                type="submit"
                disabled={itemBusy || !itemTitle.trim()}
                className="px-4 py-2.5 rounded-xl bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 transition disabled:opacity-50"
              >
                {itemBusy ? 'Adding…' : 'Add Item'}
              </button>
            </div>
          </form>
        )}
        {actionItems.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400 text-sm">No action items yet.</p>
        ) : (
          <ul className="space-y-2">
            {actionItems.map(item => {
              const canToggle = isAdmin || item.assignee_id === currentUserId
              return (
                <li key={item.id} className="flex items-start gap-3 p-3 rounded-xl border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                  <input
                    type="checkbox"
                    checked={item.done}
                    disabled={!canToggle || togglingId === item.id}
                    onChange={() => handleToggle(item)}
                    className="mt-1 w-4 h-4 accent-brand-600"
                    aria-label={`Mark "${item.title}" as ${item.done ? 'not done' : 'done'}`}
                  />
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm font-medium text-gray-900 dark:text-gray-100 ${item.done ? 'line-through text-gray-400 dark:text-gray-500' : ''}`}>
                      {item.title}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {item.assignee?.full_name ? `Assigned to ${item.assignee.full_name}` : 'Unassigned'}
                      {item.due_date ? ` · Due ${new Date(item.due_date + 'T00:00:00').toLocaleDateString(undefined, { dateStyle: 'medium' })}` : ''}
                    </p>
                  </div>
                  {item.done && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">Done</span>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}
