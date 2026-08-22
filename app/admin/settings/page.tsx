import { getAppSettings } from '@/lib/actions/app-settings'
import { AppSettingsManager } from '@/components/admin/AppSettingsManager'

export default async function AdminSettingsPage() {
  const settings = await getAppSettings()

  return (
    <div className="px-4 py-5 md:p-8 max-w-4xl animate-fade-in">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Platform Settings</h1>
      <p className="text-gray-400 text-sm mb-8">Configure global options for the Sales Academy.</p>
      
      <AppSettingsManager initialWelcome={settings?.welcome_message_template || 'Welcome {name}!'} />
    </div>
  )
}
