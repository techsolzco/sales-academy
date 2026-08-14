'use client'

import { useState } from 'react'
import { ThemeSettings } from '@/types'
import { updateThemeSettings } from '@/lib/actions/theme'

export function AppearanceForm({
  adminTheme,
  salesmanTheme
}: {
  adminTheme: ThemeSettings | null
  salesmanTheme: ThemeSettings | null
}) {
  const [adminData, setAdminData] = useState({
    primary_color: adminTheme?.primary_color || '#4F46E5',
    accent_color: adminTheme?.accent_color || '#10B981',
    theme_mode: adminTheme?.theme_mode || 'system',
  })

  const [salesmanData, setSalesmanData] = useState({
    primary_color: salesmanTheme?.primary_color || '#2563EB',
    accent_color: salesmanTheme?.accent_color || '#059669',
    theme_mode: salesmanTheme?.theme_mode || 'system',
  })

  const [loading, setLoading] = useState(false)

  async function handleSave() {
    setLoading(true)
    try {
      const r1 = await updateThemeSettings('admin', adminData as Partial<ThemeSettings>)
      if (!r1?.success) throw new Error(r1?.error || 'Unknown error updating admin theme')
      
      const r2 = await updateThemeSettings('salesman', salesmanData as Partial<ThemeSettings>)
      if (!r2?.success) throw new Error(r2?.error || 'Unknown error updating salesman theme')

      alert('Themes updated successfully!')
    } catch (e: any) {
      console.error(e)
      alert('Failed to update themes: ' + e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-8">
      {/* Admin Theme */}
      <section className="p-6 bg-white rounded-lg shadow border border-gray-200">
        <h2 className="text-xl font-semibold mb-4">Admin Portal Theme</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Primary Color</label>
            <div className="flex items-center gap-3">
              <input 
                type="color" 
                value={adminData.primary_color}
                onChange={e => setAdminData(prev => ({ ...prev, primary_color: e.target.value }))}
                className="w-12 h-12 p-1 border border-gray-300 rounded cursor-pointer"
              />
              <span className="text-sm text-gray-500 font-mono">{adminData.primary_color}</span>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Accent Color</label>
            <div className="flex items-center gap-3">
              <input 
                type="color" 
                value={adminData.accent_color}
                onChange={e => setAdminData(prev => ({ ...prev, accent_color: e.target.value }))}
                className="w-12 h-12 p-1 border border-gray-300 rounded cursor-pointer"
              />
              <span className="text-sm text-gray-500 font-mono">{adminData.accent_color}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Salesman Theme */}
      <section className="p-6 bg-white rounded-lg shadow border border-gray-200">
        <h2 className="text-xl font-semibold mb-4">Salesman Portal Theme</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Primary Color</label>
            <div className="flex items-center gap-3">
              <input 
                type="color" 
                value={salesmanData.primary_color}
                onChange={e => setSalesmanData(prev => ({ ...prev, primary_color: e.target.value }))}
                className="w-12 h-12 p-1 border border-gray-300 rounded cursor-pointer"
              />
              <span className="text-sm text-gray-500 font-mono">{salesmanData.primary_color}</span>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Accent Color</label>
            <div className="flex items-center gap-3">
              <input 
                type="color" 
                value={salesmanData.accent_color}
                onChange={e => setSalesmanData(prev => ({ ...prev, accent_color: e.target.value }))}
                className="w-12 h-12 p-1 border border-gray-300 rounded cursor-pointer"
              />
              <span className="text-sm text-gray-500 font-mono">{salesmanData.accent_color}</span>
            </div>
          </div>
        </div>
      </section>

      <div className="flex justify-end">
        <button 
          onClick={handleSave}
          disabled={loading}
          className="px-4 py-2 bg-brand-600 text-white rounded hover:bg-brand-700 disabled:opacity-50"
        >
          {loading ? 'Saving...' : 'Save Appearance'}
        </button>
      </div>
    </div>
  )
}
