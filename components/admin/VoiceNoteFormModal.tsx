'use client'

import { useState, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { X, Loader2, Upload } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { createVoiceNote, updateVoiceNote } from '@/lib/actions/voice-notes'
import type { VoiceNote, Status, AiContentType } from '@/types'
import { AiAssistButton } from '@/components/ai/AiAssistButton'

interface VoiceNoteFormModalProps {
  voiceNote?: VoiceNote | null
  isOpen: boolean
  onClose: () => void
  defaultValues?: Record<string, any>
  tools?: { id: string; name: string }[]
}

export function VoiceNoteFormModal({ voiceNote, isOpen, onClose, defaultValues, tools = [] }: VoiceNoteFormModalProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  const [form, setForm] = useState({
    title: defaultValues?.title ?? voiceNote?.title ?? '',
    audio_url: defaultValues?.audio_url ?? voiceNote?.audio_url ?? '',
    transcript: defaultValues?.transcript ?? voiceNote?.transcript ?? '',
    purpose: defaultValues?.purpose ?? voiceNote?.purpose ?? '',
    when_to_send: defaultValues?.when_to_send ?? voiceNote?.when_to_send ?? '',
    language: defaultValues?.language ?? voiceNote?.language ?? 'English',
    duration_seconds: defaultValues?.duration_seconds?.toString() ?? voiceNote?.duration_seconds?.toString() ?? '',
    key_points: (Array.isArray(defaultValues?.key_points) ? defaultValues?.key_points.join(', ') : defaultValues?.key_points) ?? voiceNote?.key_points?.join(', ') ?? '',
    tool_id: defaultValues?.tool_id ?? voiceNote?.tool_id ?? '',
    status: (defaultValues?.status ?? voiceNote?.status ?? 'published') as Status,
  })

  useEffect(() => {
    if (!isOpen) return
    setForm({
      title: defaultValues?.title ?? voiceNote?.title ?? '',
      audio_url: defaultValues?.audio_url ?? voiceNote?.audio_url ?? '',
      transcript: defaultValues?.transcript ?? voiceNote?.transcript ?? '',
      purpose: defaultValues?.purpose ?? voiceNote?.purpose ?? '',
      when_to_send: defaultValues?.when_to_send ?? voiceNote?.when_to_send ?? '',
      language: defaultValues?.language ?? voiceNote?.language ?? 'English',
      duration_seconds: defaultValues?.duration_seconds?.toString() ?? voiceNote?.duration_seconds?.toString() ?? '',
      key_points: (Array.isArray(defaultValues?.key_points) ? defaultValues?.key_points.join(', ') : defaultValues?.key_points) ?? voiceNote?.key_points?.join(', ') ?? '',
      tool_id: defaultValues?.tool_id ?? voiceNote?.tool_id ?? '',
      status: (defaultValues?.status ?? voiceNote?.status ?? 'published') as Status,
    })
  }, [voiceNote?.id, isOpen, defaultValues])

  if (!isOpen) return null

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    setError(null)

    try {
      const supabase = createClient()
      const ext = file.name.split('.').pop()
      const filename = `voice-note-${Date.now()}.${ext}`

      const { data, error: uploadErr } = await supabase
        .storage
        .from('voice-notes')
        .upload(filename, file, { cacheControl: '3600', upsert: true })

      if (uploadErr) throw uploadErr

      const { data: publicUrlData } = supabase
        .storage
        .from('voice-notes')
        .getPublicUrl(data.path)

      setForm(f => ({ ...f, audio_url: publicUrlData.publicUrl }))
    } catch (err: unknown) {
      setError(`Audio upload failed: ${(err as Error).message}`)
    } finally {
      setUploading(false)
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const payload = {
        title: form.title,
        audio_url: form.audio_url,
        transcript: form.transcript || undefined,
        purpose: form.purpose || undefined,
        when_to_send: form.when_to_send || undefined,
        language: form.language || 'English',
        duration_seconds: form.duration_seconds ? parseInt(form.duration_seconds) : undefined,
        key_points: form.key_points ? form.key_points.split(',').map((k: string) => k.trim()).filter(Boolean) : [],
        tool_id: form.tool_id || null,
        status: form.status,
      }

      const res = voiceNote
        ? await updateVoiceNote(voiceNote.id, payload)
        : await createVoiceNote(payload)

      if (res.error) {
        setError(res.error)
      } else {
        router.refresh()
        onClose()
      }
    })
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white dark:bg-gray-800 rounded-t-2xl sm:rounded-2xl border-0 sm:border border-gray-100 dark:border-gray-700 shadow-2xl w-full sm:max-w-xl max-h-[92vh] sm:max-h-[90vh] overflow-y-auto p-5 sm:p-6 animate-fade-in">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900">
            {voiceNote ? 'Edit Voice Note' : 'Add Voice Note'}
          </h2>
          <button onClick={onClose} className="p-1 rounded-lg text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-700 text-sm">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Title *</label>
            <input
              required
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="e.g. Warm Objection Pitch Voice Note"
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-brand-400 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Audio File URL or Upload *</label>
            <div className="flex gap-2">
              <input
                required
                type="url"
                value={form.audio_url}
                onChange={e => setForm(f => ({ ...f, audio_url: e.target.value }))}
                placeholder="https://.../audio.mp3"
                className="flex-1 px-3 py-2 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-brand-400 focus:outline-none"
              />
              <label className="cursor-pointer px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-700 text-xs font-semibold flex items-center gap-1.5 transition">
                {uploading ? <Loader2 className="w-4 h-4 animate-spin text-brand-600" /> : <Upload className="w-4 h-4" />}
                {uploading ? 'Uploading…' : 'Upload File'}
                <input
                  type="file"
                  accept="audio/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Purpose / Context</label>
            <input
              value={form.purpose}
              onChange={e => setForm(f => ({ ...f, purpose: e.target.value }))}
              placeholder="e.g. Explains value of AI features warmly"
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-brand-400 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">When to Send</label>
            <input
              value={form.when_to_send}
              onChange={e => setForm(f => ({ ...f, when_to_send: e.target.value }))}
              placeholder="e.g. After prospect expresses price concern"
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-brand-400 focus:outline-none"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-gray-700">Transcript (Searchable)</label>
              <AiAssistButton
                contentType="voice_note"
                fieldName="transcript"
                existingContext={JSON.stringify({ title: form.title, purpose: form.purpose })}
                onResult={(text) => setForm(f => ({ ...f, transcript: text }))}
              />
            </div>
            <textarea
              rows={4}
              value={form.transcript}
              onChange={e => setForm(f => ({ ...f, transcript: e.target.value }))}
              placeholder="Full text transcript of the audio recording…"
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-brand-400 focus:outline-none resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Language</label>
              <select
                value={form.language}
                onChange={e => setForm(f => ({ ...f, language: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-brand-400 focus:outline-none"
              >
                <option value="English">English</option>
                <option value="Urdu">Urdu (اردو)</option>
                <option value="Roman Urdu">Roman Urdu</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Status</label>
              <select
                value={form.status}
                onChange={e => setForm(f => ({ ...f, status: e.target.value as Status }))}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-brand-400 focus:outline-none"
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Tool (linked to)</label>
            <select
              value={form.tool_id}
              onChange={e => setForm(f => ({ ...f, tool_id: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 text-sm focus:ring-2 focus:ring-brand-400 focus:outline-none"
            >
              <option value="">General (no specific tool)</option>
              {tools.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Duration (seconds)</label>
              <input
                type="number"
                value={form.duration_seconds}
                onChange={e => setForm(f => ({ ...f, duration_seconds: e.target.value }))}
                placeholder="45"
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-brand-400 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Key Points (comma separated)</label>
              <input
                value={form.key_points}
                onChange={e => setForm(f => ({ ...f, key_points: e.target.value }))}
                placeholder="Warm tone, Empathy, Clear CTA"
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-brand-400 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex gap-2 pt-3">
            <button
              type="submit"
              disabled={isPending || uploading}
              className="flex-1 py-2.5 rounded-xl bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 disabled:opacity-60 transition flex items-center justify-center gap-2"
            >
              {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              {isPending ? 'Saving…' : voiceNote ? 'Update Voice Note' : 'Create Voice Note'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
