'use client'

import { useState } from 'react'
import { Search, Mic } from 'lucide-react'
import { AudioPlayer } from '@/components/audio/AudioPlayer'
import type { VoiceNote } from '@/types'

export function SalesmanVoiceNoteViewer({ notes }: { notes: VoiceNote[] }) {
  const [search, setSearch] = useState('')

  const filtered = notes.filter(n => {
    const q = search.toLowerCase()
    return (
      !q ||
      n.title.toLowerCase().includes(q) ||
      (n.transcript && n.transcript.toLowerCase().includes(q)) ||
      (n.purpose && n.purpose.toLowerCase().includes(q))
    )
  })

  return (
    <div>
      {/* Search */}
      <div className="mb-6 max-w-md">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search audio pitch or transcripts…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 bg-white"
          />
        </div>
      </div>

      {/* Cards */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100 text-gray-400 text-sm">
          <Mic className="w-10 h-10 mx-auto mb-2 text-gray-300" />
          No published voice notes found.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filtered.map(note => (
            <div key={note.id} id={`vn-${note.id}`}>
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
    </div>
  )
}
