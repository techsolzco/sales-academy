import { SITE_NAME } from '@/lib/config/site'
import { getAppSettings } from '@/lib/actions/app-settings'
import { AppSettingsManager } from '@/components/admin/AppSettingsManager'
import { ChangePasswordForm } from '@/components/settings/ChangePasswordForm'
import { MfaSetup } from '@/components/auth/MfaSetup'

export default async function AdminSettingsPage() {
  const settings = await getAppSettings()

  return (
    <div className="px-4 py-5 md:p-8 max-w-4xl animate-fade-in space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Platform Settings</h1>
        <p className="text-gray-400 text-sm">Configure global options and account security for {SITE_NAME}.</p>
      </div>

      <ChangePasswordForm />

      <MfaSetup />

      <AppSettingsManager initialWelcome={settings?.welcome_message_template || 'Welcome {name}!'} />
    </div>
  )
}

