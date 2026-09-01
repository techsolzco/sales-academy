import { getEnglishPracticeSettings } from '@/lib/actions/english-practice'
import { EnglishPracticeForm } from './EnglishPracticeForm'
import { Breadcrumb } from '@/components/admin/Breadcrumb'

export const dynamic = 'force-dynamic'

export default async function EnglishPracticeSettingsPage() {
  const settings = await getEnglishPracticeSettings()
  return (
    <div className="p-6 md:p-8 max-w-4xl animate-fade-in">
      <Breadcrumb crumbs={[
        { label: 'Admin', href: '/admin' },
        { label: 'Settings', href: '/admin/settings' },
        { label: 'English Practice' },
      ]} />
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">English Practice Settings</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500 mt-1">
          Configure the AI persona and instructions for the English Practice module.
        </p>
      </div>
      <EnglishPracticeForm initialSettings={settings} />
    </div>
  )
}
