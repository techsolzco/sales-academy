import { fetchThemeSettings } from '@/lib/actions/theme'
import { AppearanceForm } from './AppearanceForm'

export default async function AppearancePage() {
  const [adminTheme, salesmanTheme] = await Promise.all([
    fetchThemeSettings('admin'),
    fetchThemeSettings('salesman')
  ])

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Appearance Settings</h1>
      <AppearanceForm 
        adminTheme={adminTheme} 
        salesmanTheme={salesmanTheme} 
      />
    </div>
  )
}
