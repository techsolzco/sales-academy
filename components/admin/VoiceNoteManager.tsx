'use client'

import { useState, useTransition, useMemo } from 'react'
import { Plus, Edit, Trash2, Search, Mic, ChevronDown, ChevronRight, LayoutList, FolderTree } from 'lucide-react'
import { StatusBadge } from '@/components/admin/StatusBadge'
import { VoiceNoteFormModal } from '@/components/admin/VoiceNoteFormModal'
import { AudioPlayer } from '@/components/audio/AudioPlayer'
import { QuickCreateButton } from '@/components/ai/QuickCreateButton'
import { deleteVoiceNote } from '@/lib/actions/voice-notes'
import { TranslateContextWrapper } from '@/components/ui/TranslateContextWrapper'
import type { VoiceNote } from '@/types'

export function VoiceNoteManager({ initialNotes, tools = [] }: { initialNotes: VoiceNote[], tools?: { id: string; name: string }[] }) {
  const [notes, setNotes] = useState(initialNotes)
  const [search, setSearch] = useState('')
  const [filterToolId, setFilterToolId] = useState('')
  const [viewMode, setViewMode] = useState<'list' | 'grouped'>('grouped')
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({})
  const [selectedNote, setSelectedNote] = useState<VoiceNote | null>(null)
  const [aiDraft, setAiDraft] = useState<Record<string, unknown> | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  const filtered = notes.filter(n => {
    const q = search.toLowerCase()
    const matchesSearch =
      !q ||
      n.title.toLowerCase().includes(q) ||
      (n.transcript && n.transcript.toLowerCase().includes(q)) ||
      (n.purpose && n.purpose.toLowerCase().includes(q))
    const matchesTool = !filterToolId || n.tool_id === filterToolId
    return matchesSearch && matchesTool
  })

  const grouped = useMemo(() => {
    const map = new Map<string, { name: string; items: VoiceNote[] }>()
    map.set('uncategorized', { name: 'Uncategorized', items: [] })
    tools.forEach(t => map.set(t.id, { name: t.name, items: [] }))
    
    filtered.forEach(n => {
      const key = n.tool_id && map.has(n.tool_id) ? n.tool_id : 'uncategorized'
      map.get(key)!.items.push(n)
    })
    
    return Array.from(map.entries())
      .filter(([_, v]) => v.items.length > 0)
      .sort((a, b) => b[1].items.length - a[1].items.length || a[1].name.localeCompare(b[1].name))
  }, [filtered, tools])

  function toggleGroup(key: string) {
    setExpandedGroups(prev => ({ ...prev, [key]: !prev[key] }))
  }

  function handleCreate() {
    setAiDraft(null)
    setSelectedNote(null)
    setIsModalOpen(true)
  }

  function handleEdit(note: VoiceNote) {
    setAiDraft(null)
    setSelectedNote(note)
    setIsModalOpen(true)
  }

  function handleQuickCreate(data: Record<string, unknown>) {
    setAiDraft({ ...data, status: 'draft' })
    setSelectedNote(null)
    setIsModalOpen(true)
  }

  function handleClose() {
    setIsModalOpen(false)
    setAiDraft(null)
  }

  function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this voice note?')) return
    startTransition(async () => {
      const res = await deleteVoiceNote(id)
      if (!res.error) {
        setNotes(prev => prev.filter(n => n.id !== id))
      }
    })
  }

  function renderNoteCard(note: VoiceNote) {
    return (
      <TranslateContextWrapper
        key={note.id}
        table="voice_notes"
        recordId={note.id}
        fieldsToTranslate={{
          transcript_translated: note.transcript || ''
        }}
        initialTranslations={{
          transcript_translated: note.transcript_translated
        }}
      >
        {({ displayTexts, toggleButton }) => (
          <div className="relative group">
            <div className="absolute top-4 right-4 z-10 flex items-center gap-1">
              {toggleButton}
              <StatusBadge status={note.status} />
              <button
                onClick={() => handleEdit(note)}
                className="p-1.5 rounded-lg bg-white/90 border border-gray-200 text-gray-600 hover:text-brand-600 transition"
                title="Edit Voice Note"
              >
                <Edit className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => handleDelete(note.id)}
                disabled={isPending}
                className="p-1.5 rounded-lg bg-white/90 border border-gray-200 text-gray-600 hover:text-red-600 transition disabled:opacity-40"
                title="Delete Voice Note"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
            <AudioPlayer
              title={note.title}
              audioUrl={note.audio_url}
              transcript={displayTexts.transcript_translated}
              durationSeconds={note.duration_seconds}
              purpose={note.purpose}
              whenToSend={note.when_to_send}
              keyPoints={note.key_points}
            />
          </div>
        )}
      </TranslateContextWrapper>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search voice notes or transcripts…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
            />
          </div>
          <select
            value={filterToolId}
            onChange={e => setFilterToolId(e.target.value)}
            className="px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
          >
            <option value="">All Tools</option>
            {tools.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex bg-gray-100 p-1 rounded-xl mr-2">
            <button 
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-white shadow-sm text-brand-600' : 'text-gray-500 hover:text-gray-900'}`}
              title="List View"
            >
              <LayoutList className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setViewMode('grouped')}
              className={`p-1.5 rounded-lg transition-colors ${viewMode === 'grouped' ? 'bg-white shadow-sm text-brand-600' : 'text-gray-500 hover:text-gray-900'}`}
              title="Grouped by Tool"
            >
              <FolderTree className="w-4 h-4" />
            </button>
          </div>

          <QuickCreateButton
            contentType="voice_note"
            onCreated={handleQuickCreate}
          />
          <button
            onClick={handleCreate}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 text-white font-medium text-sm hover:bg-brand-700 transition shadow-sm"
          >
            <Plus className="w-4 h-4" /> Add Voice Note
          </button>
        </div>
      </div>

      {/* Cards */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100 text-gray-400 text-sm">
          <Mic className="w-10 h-10 mx-auto mb-2 text-gray-300" />
          No voice notes found.
        </div>
      ) : (
        viewMode === 'list' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filtered.map(renderNoteCard)}
          </div>
        ) : (
          <div className="space-y-6">
            {grouped.map(([key, group]) => {
              const isExpanded = expandedGroups[key] !== false
              return (
                <div key={key} className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
                  <button 
                    onClick={() => toggleGroup(key)}
                    className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition text-left"
                  >
                    <div className="flex items-center gap-2">
                      {isExpanded ? <ChevronDown className="w-5 h-5 text-gray-500" /> : <ChevronRight className="w-5 h-5 text-gray-500" />}
                      <span className="font-bold text-gray-900">{group.name}</span>
                      <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full font-medium">
                        {group.items.length}
                      </span>
                    </div>
                  </button>
                  
                  {isExpanded && (
                    <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-6 bg-white">
                      {group.items.map(renderNoteCard)}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )
      )}

      <VoiceNoteFormModal
        voiceNote={selectedNote}
        isOpen={isModalOpen}
        onClose={handleClose}
        defaultValues={aiDraft || undefined}
      />
    </div>
  )
}
