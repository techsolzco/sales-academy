import { createClient } from '@/lib/supabase/server'
import { VoiceNoteManager } from '@/components/admin/VoiceNoteManager'
import { Breadcrumb } from '@/components/admin/Breadcrumb'

export default async function AdminVoiceNotesPage({
  searchParams,
}: {
  searchParams: { tool?: string }
}) {
  const supabase = await createClient()

  const [notesRes, toolsRes] = await Promise.all([
    supabase
      .from('voice_notes')
      .select('*')
      .order('created_at', { ascending: false }),
    supabase
      .from('tools')
      .select('id, name')
      .eq('status', 'published')
      .order('name')
  ])

  return (
    <div className="p-8 max-w-6xl animate-fade-in">
      <Breadcrumb crumbs={[
        { label: 'Admin', href: '/admin' },
        { label: 'Voice Notes' },
      ]} />

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Voice Notes Library</h1>
        <p className="text-sm text-gray-400 mt-1">
          Upload sample pitch audio, objection responses, and customer voice notes for salesman practice and reference.
        </p>
      </div>

      <VoiceNoteManager initialNotes={notesRes.data ?? []} tools={toolsRes.data ?? []} initialToolId={searchParams.tool} />
    </div>
  )
}
