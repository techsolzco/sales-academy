'use client'

import { useState, useTransition } from 'react'
import { Search, UserPlus, UserMinus, Users, Loader2, Check } from 'lucide-react'
import { assignUsers, assignAllSalesmen, unassignUser } from '@/lib/actions/assignments'
import type { Profile } from '@/types'

interface AssignedUser {
  user_id: string
  full_name: string
  email: string
  department: string | null
  completed_lessons: number
  total_lessons: number
}

interface AssignmentPanelProps {
  courseId: string
  allSalesmen: Profile[]
  assignedUsers: AssignedUser[]
}

function ProgressBar({ completed, total }: { completed: number; total: number }) {
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-gray-100 overflow-hidden">
        <div className="h-full rounded-full bg-brand-500 transition-all" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-gray-400 w-8 text-right">{pct}%</span>
    </div>
  )
}

export function AssignmentPanel({ courseId, allSalesmen, assignedUsers }: AssignmentPanelProps) {
  const [isPending, startTransition] = useTransition()
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [localAssigned, setLocalAssigned] = useState<AssignedUser[]>(assignedUsers)
  const [feedback, setFeedback] = useState<string | null>(null)

  const assignedIds = new Set(localAssigned.map(u => u.user_id))

  const available = allSalesmen.filter(s =>
    !assignedIds.has(s.id) &&
    (search === '' ||
      s.full_name.toLowerCase().includes(search.toLowerCase()) ||
      s.email.toLowerCase().includes(search.toLowerCase()))
  )

  function toggleSelect(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function handleAssignSelected() {
    if (selected.size === 0) return
    startTransition(async () => {
      const ids = Array.from(selected)
      const result = await assignUsers(courseId, ids)
      if (!result.error) {
        const newlyAssigned = allSalesmen
          .filter(s => ids.includes(s.id))
          .map(s => ({ user_id: s.id, full_name: s.full_name, email: s.email, department: s.department, completed_lessons: 0, total_lessons: localAssigned[0]?.total_lessons ?? 0 }))
        setLocalAssigned(prev => [...prev, ...newlyAssigned])
        setSelected(new Set())
        setFeedback(`Assigned ${ids.length} salesman${ids.length !== 1 ? 'men' : ''}.`)
        setTimeout(() => setFeedback(null), 3000)
      }
    })
  }

  function handleAssignAll() {
    startTransition(async () => {
      const result = await assignAllSalesmen(courseId)
      if (!result.error) {
        const newlyAssigned = allSalesmen
          .filter(s => !assignedIds.has(s.id))
          .map(s => ({ user_id: s.id, full_name: s.full_name, email: s.email, department: s.department, completed_lessons: 0, total_lessons: localAssigned[0]?.total_lessons ?? 0 }))
        setLocalAssigned(prev => [...prev, ...newlyAssigned])
        setFeedback(`Assigned all ${result.data?.count} salesmen.`)
        setTimeout(() => setFeedback(null), 3000)
      }
    })
  }

  function handleRemove(userId: string) {
    startTransition(async () => {
      const result = await unassignUser(courseId, userId)
      if (!result.error) {
        setLocalAssigned(prev => prev.filter(u => u.user_id !== userId))
      }
    })
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

      {/* Left: Currently Assigned */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-900 text-sm">
            Currently Assigned ({localAssigned.length})
          </h3>
        </div>

        {feedback && (
          <div className="mb-3 flex items-center gap-2 p-2.5 rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm animate-fade-in">
            <Check className="w-4 h-4 flex-shrink-0" />
            {feedback}
          </div>
        )}

        {localAssigned.length === 0 ? (
          <div className="text-center py-10 rounded-xl border border-dashed border-gray-200 text-gray-400 text-sm">
            No one assigned yet.
          </div>
        ) : (
          <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
            {localAssigned.map(user => (
              <div key={user.user_id} className="flex items-center gap-3 p-3 rounded-xl bg-white border border-gray-100">
                <div className="w-9 h-9 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center font-semibold text-sm flex-shrink-0">
                  {user.full_name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{user.full_name}</p>
                  <p className="text-xs text-gray-400 truncate">{user.email}</p>
                  {user.total_lessons > 0 && (
                    <div className="mt-1">
                      <ProgressBar completed={user.completed_lessons} total={user.total_lessons} />
                    </div>
                  )}
                </div>
                <button
                  onClick={() => handleRemove(user.user_id)}
                  disabled={isPending}
                  className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition flex-shrink-0"
                  title="Remove assignment"
                >
                  <UserMinus className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Right: Add Salesmen */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-900 text-sm">
            Add Salesmen ({available.length} available)
          </h3>
          <div className="flex gap-2">
            {selected.size > 0 && (
              <button
                onClick={handleAssignSelected}
                disabled={isPending}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-600 text-white text-xs font-medium hover:bg-brand-700 disabled:opacity-60 transition"
              >
                {isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <UserPlus className="w-3 h-3" />}
                Assign {selected.size}
              </button>
            )}
            <button
              onClick={handleAssignAll}
              disabled={isPending || available.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 text-xs font-medium hover:bg-gray-50 disabled:opacity-40 transition"
            >
              <Users className="w-3 h-3" /> Assign All
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search salesmen…"
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
          />
        </div>

        {available.length === 0 ? (
          <div className="text-center py-10 rounded-xl border border-dashed border-gray-200 text-gray-400 text-sm">
            {search ? 'No salesmen match your search.' : 'All salesmen are already assigned.'}
          </div>
        ) : (
          <div className="space-y-1.5 max-h-[460px] overflow-y-auto pr-1">
            {available.map(s => (
              <label key={s.id} className="flex items-center gap-3 p-3 rounded-xl bg-white border border-gray-100 cursor-pointer hover:border-brand-200 transition">
                <input
                  type="checkbox"
                  checked={selected.has(s.id)}
                  onChange={() => toggleSelect(s.id)}
                  className="w-4 h-4 rounded accent-brand-600"
                />
                <div className="w-8 h-8 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center font-semibold text-sm flex-shrink-0">
                  {s.full_name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{s.full_name}</p>
                  <p className="text-xs text-gray-400 truncate">{s.email}{s.department ? ` · ${s.department}` : ''}</p>
                </div>
              </label>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
