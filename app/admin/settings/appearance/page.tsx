import { fetchThemeSettings } from '@/lib/actions/theme'
import { AppearanceForm } from './AppearanceForm'

export const dynamic = 'force-dynamic'

export default async function AppearancePage() {
  const [adminTheme, salesmanTheme] = await Promise.all([
    fetchThemeSettings('admin'),
    fetchThemeSettings('salesman')
  ])

  return (
    <div className="p-6 md:p-8 max-w-3xl animate-fade-in">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Appearance Settings</h1>
        <p className="text-sm text-gray-500 mt-1">
          Customize the brand colors for the Admin and Salesman portals. Changes apply live across the entire app.
        </p>
      </div>
      <AppearanceForm 
        adminTheme={adminTheme} 
        salesmanTheme={salesmanTheme} 
      />
    </div>
  )
}
