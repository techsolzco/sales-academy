import { fetchAnnouncements } from '@/lib/actions/announcements'
import { AnnouncementManager } from '@/components/admin/AnnouncementManager'
import { Breadcrumb } from '@/components/admin/Breadcrumb'

export const dynamic = 'force-dynamic'

export default async function AdminAnnouncementsPage() {
  const announcements = await fetchAnnouncements()
  return (
    <div className="px-4 py-5 md:p-8 max-w-4xl">
      <Breadcrumb crumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Announcements' }]} />
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Announcements</h1>
        <p className="text-sm text-gray-400 mt-1">Publish notices, updates, and documents for your team.</p>
      </div>
      <AnnouncementManager initialAnnouncements={announcements} />
    </div>
  )
}
