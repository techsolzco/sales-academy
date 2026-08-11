'use client'

import { useState, useTransition } from 'react'
import { Plus, Edit, Trash2, Search, Mic } from 'lucide-react'
import { StatusBadge } from '@/components/admin/StatusBadge'
import { VoiceNoteFormModal } from '@/components/admin/VoiceNoteFormModal'
import { AudioPlayer } from '@/components/audio/AudioPlayer'
import { deleteVoiceNote } from '@/lib/actions/voice-notes'
import type { VoiceNote } from '@/types'

export function VoiceNoteManager({ initialNotes }: { initialNotes: VoiceNote[] }) {
  const [notes, setNotes] = useState(initialNotes)
  const [search, setSearch] = useState('')
  const [selectedNote, setSelectedNote] = useState<VoiceNote | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  const filtered = notes.filter(n => {
    const q = search.toLowerCase()
    return (
      !q ||
      n.title.toLowerCase().includes(q) ||
      (n.transcript && n.transcript.toLowerCase().includes(q)) ||
      (n.purpose && n.purpose.toLowerCase().includes(q))
    )
  })

  function handleCreate() {
    setSelectedNote(null)
    setIsModalOpen(true)
  }

  function handleEdit(note: VoiceNote) {
    setSelectedNote(note)
    setIsModalOpen(true)
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

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mb-6">
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

        <button
          onClick={handleCreate}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 text-white font-medium text-sm hover:bg-brand-700 transition shadow-sm"
        >
          <Plus className="w-4 h-4" /> Add Voice Note
        </button>
      </div>

      {/* Cards */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100 text-gray-400 text-sm">
          <Mic className="w-10 h-10 mx-auto mb-2 text-gray-300" />
          No voice notes found.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filtered.map(note => (
            <div key={note.id} className="relative group">
              <div className="absolute top-4 right-4 z-10 flex items-center gap-1">
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
                transcript={note.transcript}
                durationSeconds={note.duration_seconds}
                purpose={note.purpose}
                whenToSend={note.when_to_send}
                keyPoints={note.key_points}
              />
            </div>
          ))}
        </div>
      )}

      <VoiceNoteFormModal
        voiceNote={selectedNote}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  )
}
