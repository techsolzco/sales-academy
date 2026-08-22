import { fetchAnnouncements, markAnnouncementRead } from '@/lib/actions/announcements'
import { Megaphone, Paperclip, ExternalLink } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function AnnouncementsPage() {
  const announcements = await fetchAnnouncements(true)

  return (
    <div className="px-4 py-5 md:p-8 max-w-3xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Announcements</h1>
        <p className="text-gray-400 text-sm mt-1">Important notices and updates from management.</p>
      </div>

      {announcements.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Megaphone className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p>No announcements at this time.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {announcements.map(a => (
            <div key={a.id} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-6">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-9 h-9 rounded-xl bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center flex-shrink-0">
                  <Megaphone className="w-4 h-4 text-brand-600" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">{a.title}</h2>
                  <p className="text-xs text-gray-400 mt-0.5">{new Date(a.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                </div>
              </div>
              <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">{a.body}</p>
              {a.attachment_url && (
                <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Attachment</p>
                  <a
                    href={a.attachment_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-400 rounded-xl text-sm font-medium hover:bg-brand-100 dark:hover:bg-brand-900/40 transition border border-brand-100 dark:border-brand-800"
                  >
                    <Paperclip className="w-4 h-4" />
                    {a.attachment_name || 'View Attachment'}
                    <ExternalLink className="w-3 h-3 opacity-60" />
                  </a>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
