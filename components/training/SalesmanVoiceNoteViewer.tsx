'use client'

import { useState, useMemo, useEffect } from 'react'
import { Search, Mic, ChevronDown, ChevronRight, LayoutList, FolderTree, Upload, Loader2 } from 'lucide-react'
import { AudioPlayer } from '@/components/audio/AudioPlayer'
import { TranslateContextWrapper } from '@/components/ui/TranslateContextWrapper'
import { createClient } from '@/lib/supabase/client'
import { upsertSalesmanRecording } from '@/lib/actions/voice-recordings'
import type { VoiceNote } from '@/types'

export function SalesmanVoiceNoteViewer({ notes, tools = [], currentUserId, salesmanRecordings = {}, initialToolId = '', initialLang }: { notes: VoiceNote[], tools?: { id: string; name: string }[], currentUserId?: string, salesmanRecordings?: Record<string, string>, initialToolId?: string, initialLang?: 'en' | 'hi' }) {
  const [search, setSearch] = useState('')
  const [filterToolId, setFilterToolId] = useState(initialToolId)
  const [viewMode, setViewMode] = useState<'list' | 'grouped'>('grouped')
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({})
  const [uploadingFor, setUploadingFor] = useState<string | null>(null)

  const supabase = createClient()

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

  async function handleFileUpload(voiceNoteId: string, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !currentUserId) return
    setUploadingFor(voiceNoteId)
    try {
      const ext = file.name.split('.').pop()
      const filePath = `salesman/${currentUserId}/${voiceNoteId}_${Date.now()}.${ext}`
      const { error: uploadError } = await supabase.storage.from('voice-notes').upload(filePath, file)
      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage.from('voice-notes').getPublicUrl(filePath)
      await upsertSalesmanRecording(voiceNoteId, publicUrl)
      // Next.js will revalidate the page
    } catch (err) {
      console.error('Upload failed:', err)
      alert('Failed to upload recording.')
    } finally {
      setUploadingFor(null)
    }
  }

  function renderNoteCard(note: VoiceNote) {
    const myRecordingUrl = salesmanRecordings[note.id]
    const showOfficialAudio = note.admin_audio_visible !== false

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
          <div id={`vn-${note.id}`} className="relative group flex flex-col gap-4 bg-white rounded-xl shadow-sm p-4 border border-gray-100">
            <div className="absolute top-4 right-4 z-10">
              {toggleButton}
            </div>
            
            {showOfficialAudio && (
              <AudioPlayer
                title={note.title}
                audioUrl={note.audio_url}
                transcript={displayTexts.transcript_translated}
                durationSeconds={note.duration_seconds}
                purpose={note.purpose}
                whenToSend={note.when_to_send}
                keyPoints={note.key_points}
              />
            )}
            {!showOfficialAudio && (
              <div className="flex flex-col gap-2">
                <h3 className="font-semibold text-gray-900">{note.title}</h3>
                <p className="text-sm text-gray-500 italic">Official audio is hidden. Read the transcript to practice your own recording.</p>
                {note.transcript && <p className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 p-3 rounded-lg">{displayTexts.transcript_translated || note.transcript}</p>}
              </div>
            )}

            <div className="border-t border-gray-100 pt-4 mt-2">
              <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2 mb-3">
                🎙️ My Recording
              </h4>
              {myRecordingUrl ? (
                <div className="space-y-3">
                  <audio controls src={myRecordingUrl} className="w-full h-10" />
                </div>
              ) : (
                <p className="text-xs text-gray-500 mb-3">You haven't uploaded a recording for this pitch yet.</p>
              )}
              
              <div className="mt-3">
                <label className="cursor-pointer inline-flex items-center justify-center gap-2 px-4 py-2 bg-brand-50 text-brand-700 hover:bg-brand-100 rounded-lg text-sm font-medium transition w-full sm:w-auto">
                  {uploadingFor === note.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  {uploadingFor === note.id ? 'Uploading...' : 'Upload My Recording'}
                  <input type="file" accept="audio/*" className="hidden" onChange={(e) => handleFileUpload(note.id, e)} disabled={uploadingFor === note.id} />
                </label>
              </div>
            </div>

          </div>
        )}
      </TranslateContextWrapper>
    )
  }

  return (
    <div>
      {/* Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search audio pitch or transcripts…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 bg-white"
            />
          </div>
          <select
            value={filterToolId}
            onChange={e => setFilterToolId(e.target.value)}
            className="px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 bg-white"
          >
            <option value="">All Tools</option>
            {tools.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>

        <div className="flex bg-gray-100 p-1 rounded-xl">
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
      </div>

      {/* Cards */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100 text-gray-400 text-sm">
          <Mic className="w-10 h-10 mx-auto mb-2 text-gray-300" />
          No published voice notes found.
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
    </div>
  )
}
