'use client'

import { useState, useTransition } from 'react'
import { Settings2, Users, Shield, Loader2, ChevronDown, ChevronUp, ToggleLeft, ToggleRight } from 'lucide-react'
import { upsertAssignmentRule, toggleExpertStatus } from '@/lib/actions/assignment-rules'

interface Salesman {
  id: string
  full_name: string | null
  email: string
}

interface Props {
  toolId: string
  toolName: string
  existingRule: {
    id?: string
    daily_faqs: number
    daily_scripts: number
    daily_objections: number
    applies_to: 'all' | 'specific'
    enabled: boolean
    users?: { user_id: string }[]
  } | null
  salesmen: Salesman[]
  expertUserIds: string[]
}

export function AssignmentRulesPanel({ toolId, toolName, existingRule, salesmen, expertUserIds }: Props) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  // Rule form state
  const [enabled, setEnabled] = useState(existingRule?.enabled ?? true)
  const [dailyFaqs, setDailyFaqs] = useState(existingRule?.daily_faqs ?? 0)
  const [dailyScripts, setDailyScripts] = useState(existingRule?.daily_scripts ?? 0)
  const [dailyObjections, setDailyObjections] = useState(existingRule?.daily_objections ?? 0)
  const [appliesTo, setAppliesTo] = useState<'all' | 'specific'>(existingRule?.applies_to ?? 'all')
  const [selectedUsers, setSelectedUsers] = useState<string[]>(
    (existingRule?.users || []).map(u => u.user_id)
  )
  const [experts, setExperts] = useState<string[]>(expertUserIds)
  const [saveMsg, setSaveMsg] = useState('')
  const [error, setError] = useState('')

  const totalPerDay = dailyFaqs + dailyScripts + dailyObjections

  const handleSave = () => {
    if (totalPerDay === 0) { setError('Set at least 1 item per day to enable the rule.'); return }
    setError('')
    startTransition(async () => {
      const res = await upsertAssignmentRule(toolId, {
        daily_faqs: dailyFaqs,
        daily_scripts: dailyScripts,
        daily_objections: dailyObjections,
        applies_to: appliesTo,
        enabled,
        user_ids: appliesTo === 'specific' ? selectedUsers : [],
      })
      if ((res as any).error) { setError((res as any).error); return }
      setSaveMsg('Rule saved!')
      setTimeout(() => setSaveMsg(''), 3000)
    })
  }

  const handleToggleExpert = (userId: string) => {
    startTransition(async () => {
      const res = await toggleExpertStatus(userId, toolId)
      if ((res as any).error) return
      const isNowExpert = (res as any).isExpert
      setExperts(prev => isNowExpert ? [...prev, userId] : prev.filter(id => id !== userId))
    })
  }

  const toggleUser = (uid: string) => {
    setSelectedUsers(prev => prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid])
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden mt-6">
      {/* Header */}
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center">
            <Settings2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div className="text-left">
            <p className="text-sm font-bold text-gray-800 dark:text-gray-100">Auto-Assignment Rules</p>
            <p className="text-xs text-gray-400">
              {existingRule?.enabled
                ? `Active — ${existingRule.daily_faqs}F + ${existingRule.daily_scripts}S + ${existingRule.daily_objections}O per day`
                : 'No rule configured — salesmen receive no auto-assignments for this tool'}
            </p>
          </div>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </button>

      {open && (
        <div className="px-5 pb-5 border-t border-gray-100 dark:border-gray-700">
          {/* Enable toggle */}
          <div className="flex items-center justify-between py-4">
            <div>
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Rule Enabled</p>
              <p className="text-xs text-gray-400">When enabled, salesmen receive daily study assignments automatically</p>
            </div>
            <button onClick={() => setEnabled(v => !v)} className="flex-shrink-0">
              {enabled
                ? <ToggleRight className="w-8 h-8 text-brand-600" />
                : <ToggleLeft className="w-8 h-8 text-gray-400" />}
            </button>
          </div>

          {/* Daily count sliders */}
          <div className="space-y-4 mb-5">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Daily Content Items</p>
            {[
              { label: '❓ FAQs per day', value: dailyFaqs, set: setDailyFaqs, color: 'accent-emerald-600' },
              { label: '💬 Scripts per day', value: dailyScripts, set: setDailyScripts, color: 'accent-violet-600' },
              { label: '🛡️ Objections per day', value: dailyObjections, set: setDailyObjections, color: 'accent-amber-600' },
            ].map(({ label, value, set, color }) => (
              <div key={label} className="flex items-center gap-4">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-300 w-36 flex-shrink-0">{label}</span>
                <input
                  type="range" min="0" max="10" step="1"
                  value={value}
                  onChange={e => set(Number(e.target.value))}
                  className={`flex-1 ${color}`}
                />
                <span className="w-6 text-center text-sm font-bold text-gray-800 dark:text-gray-100">{value}</span>
              </div>
            ))}
            <div className="flex justify-end">
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {totalPerDay} item{totalPerDay !== 1 ? 's' : ''} per salesman per day
              </span>
            </div>
          </div>

          {/* Applies to */}
          <div className="mb-5">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Applies To</p>
            <div className="flex gap-3">
              {(['all', 'specific'] as const).map(opt => (
                <button
                  key={opt}
                  onClick={() => setAppliesTo(opt)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border transition-colors ${
                    appliesTo === opt
                      ? 'bg-brand-600 text-white border-brand-600'
                      : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-brand-300'
                  }`}
                >
                  {opt === 'all' ? <><Users className="w-3.5 h-3.5" /> All Salesmen</> : <><Shield className="w-3.5 h-3.5" /> Specific Only</>}
                </button>
              ))}
            </div>

            {appliesTo === 'specific' && (
              <div className="mt-3 border border-gray-200 dark:border-gray-600 rounded-xl overflow-hidden max-h-48 overflow-y-auto">
                {salesmen.map(s => (
                  <label key={s.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedUsers.includes(s.id)}
                      onChange={() => toggleUser(s.id)}
                      className="w-4 h-4 rounded border-gray-300 text-brand-600 accent-brand-600"
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">{s.full_name || s.email}</p>
                      <p className="text-xs text-gray-400 truncate">{s.email}</p>
                    </div>
                    {experts.includes(s.id) && (
                      <span className="ml-auto text-xs bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 px-2 py-0.5 rounded-full font-medium flex-shrink-0">Expert</span>
                    )}
                  </label>
                ))}
                {salesmen.length === 0 && <p className="px-4 py-4 text-sm text-gray-500 text-center">No active salesmen</p>}
              </div>
            )}
          </div>

          {/* Save */}
          {error && <p className="text-sm text-red-600 dark:text-red-400 mb-3">{error}</p>}
          {saveMsg && <p className="text-sm text-green-600 dark:text-green-400 mb-3">✓ {saveMsg}</p>}
          <button
            onClick={handleSave}
            disabled={isPending}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : '💾'}
            Save Rule
          </button>

          {/* Expert Management */}
          <div className="mt-6 pt-5 border-t border-gray-100 dark:border-gray-700">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Expert Salesmen</p>
            <p className="text-xs text-gray-400 mb-3">
              Experts are automatically excluded from auto-assignments for {toolName}. Mark a salesman as expert once they have mastered this tool.
            </p>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {salesmen.map(s => {
                const isExpert = experts.includes(s.id)
                return (
                  <div key={s.id} className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">{s.full_name || s.email}</p>
                      <p className="text-xs text-gray-400 truncate">{s.email}</p>
                    </div>
                    <button
                      onClick={() => handleToggleExpert(s.id)}
                      disabled={isPending}
                      className={`flex-shrink-0 ml-3 px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                        isExpert
                          ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 hover:bg-yellow-200'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      {isExpert ? '🎓 Expert' : 'Mark Expert'}
                    </button>
                  </div>
                )
              })}
              {salesmen.length === 0 && <p className="text-sm text-gray-500 text-center py-4">No active salesmen</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
