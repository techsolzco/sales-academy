import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { SalesmanVoiceNoteViewer } from '@/components/training/SalesmanVoiceNoteViewer'

export default async function SalesmanVoiceNotesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const [notesRes, toolsRes, recordingsRes] = await Promise.all([
    supabase
      .from('voice_notes')
      .select('*')
      .eq('status', 'published')
      .order('created_at', { ascending: false }),
    supabase
      .from('tools')
      .select('id, name')
      .eq('status', 'published')
      .order('name'),
    supabase
      .from('salesman_voice_recordings')
      .select('voice_note_id, audio_url')
      .eq('user_id', user.id)
  ])
  const notes = notesRes.data ?? []
  const tools = toolsRes.data ?? []
  
  const salesmanRecordings = (recordingsRes.data ?? []).reduce((acc: Record<string, string>, curr) => {
    acc[curr.voice_note_id] = curr.audio_url
    return acc
  }, {})

  return (
    <div className="p-8 max-w-6xl animate-fade-in">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Audio Pitches & Voice Notes</h1>
        <p className="text-gray-400 text-sm mt-1">
          Listen to sample voice notes, study tone and delivery, and search full audio transcripts.
        </p>
      </div>

      <SalesmanVoiceNoteViewer notes={notes} tools={tools} currentUserId={user.id} salesmanRecordings={salesmanRecordings} />
    </div>
  )
}
