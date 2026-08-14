'use client'

import { useState, useCallback } from 'react'
import { ThemeSettings } from '@/types'
import { updateThemeSettings } from '@/lib/actions/theme'
import { hexToHSL } from '@/lib/utils/themeUtils'

// ---------------------------------------------------------------------------
// 20 Preset color themes
// ---------------------------------------------------------------------------
const PRESETS = [
  { name: 'Indigo',      primary: '#4F46E5', accent: '#10B981' },
  { name: 'Ocean Blue',  primary: '#2563EB', accent: '#06B6D4' },
  { name: 'Forest',      primary: '#16A34A', accent: '#84CC16' },
  { name: 'Royal Purple',primary: '#7C3AED', accent: '#EC4899' },
  { name: 'Slate',       primary: '#475569', accent: '#0EA5E9' },
  { name: 'Crimson',     primary: '#DC2626', accent: '#F59E0B' },
  { name: 'Amber',       primary: '#D97706', accent: '#10B981' },
  { name: 'Teal',        primary: '#0D9488', accent: '#3B82F6' },
  { name: 'Coral',       primary: '#F43F5E', accent: '#FB923C' },
  { name: 'Emerald',     primary: '#059669', accent: '#0891B2' },
  { name: 'Sky Blue',    primary: '#0284C7', accent: '#7C3AED' },
  { name: 'Rose',        primary: '#E11D48', accent: '#A855F7' },
  { name: 'Charcoal',    primary: '#374151', accent: '#6366F1' },
  { name: 'Lavender',    primary: '#7C3AED', accent: '#06B6D4' },
  { name: 'Mint',        primary: '#14B8A6', accent: '#84CC16' },
  { name: 'Burgundy',    primary: '#9F1239', accent: '#D97706' },
  { name: 'Navy',        primary: '#1E3A5F', accent: '#38BDF8' },
  { name: 'Orange',      primary: '#EA580C', accent: '#FACC15' },
  { name: 'Graphite',    primary: '#4B5563', accent: '#22D3EE' },
  { name: 'Sunset Pink', primary: '#DB2777', accent: '#F97316' },
] as const

type PortalTheme = {
  primary_color: string
  accent_color: string
  theme_mode: 'system' | 'light' | 'dark'
}

function ColorSection({
  label,
  data,
  onChange,
  onLivePreview,
}: {
  label: string
  data: PortalTheme
  onChange: (patch: Partial<PortalTheme>) => void
  onLivePreview: (primary: string, accent: string) => void
}) {
  return (
    <section className="p-6 bg-white rounded-xl shadow-sm border border-gray-200 space-y-6">
      <h2 className="text-lg font-semibold text-gray-900">{label}</h2>

      {/* Preset swatches */}
      <div>
        <p className="text-sm font-medium text-gray-600 mb-3">Quick Presets</p>
        <div className="grid grid-cols-5 gap-2">
          {PRESETS.map((preset) => {
            const isSelected =
              data.primary_color.toLowerCase() === preset.primary.toLowerCase()
            return (
              <button
                key={preset.name}
                title={preset.name}
                onClick={() => {
                  onChange({ primary_color: preset.primary, accent_color: preset.accent })
                  onLivePreview(preset.primary, preset.accent)
                }}
                style={{ background: preset.primary }}
                className={`h-9 rounded-lg transition-all hover:scale-105 hover:shadow-md ${
                  isSelected ? 'ring-2 ring-offset-2 ring-gray-800 scale-105' : ''
                }`}
              >
                <span className="sr-only">{preset.name}</span>
              </button>
            )
          })}
        </div>
        {/* Show name of currently matching preset */}
        {(() => {
          const matched = PRESETS.find(
            (p) => p.primary.toLowerCase() === data.primary_color.toLowerCase()
          )
          return matched ? (
            <p className="text-xs text-gray-400 mt-2">Selected: {matched.name}</p>
          ) : null
        })()}
      </div>

      {/* Manual color inputs */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Primary Color</label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={data.primary_color}
              onChange={(e) => {
                onChange({ primary_color: e.target.value })
                onLivePreview(e.target.value, data.accent_color)
              }}
              className="w-10 h-10 p-0.5 border border-gray-300 rounded-lg cursor-pointer"
            />
            <input
              type="text"
              value={data.primary_color}
              onChange={(e) => {
                if (/^#[0-9A-Fa-f]{0,6}$/.test(e.target.value)) {
                  onChange({ primary_color: e.target.value })
                  if (e.target.value.length === 7) onLivePreview(e.target.value, data.accent_color)
                }
              }}
              className="flex-1 text-xs font-mono border border-gray-200 rounded-lg px-2 py-2 bg-gray-50"
              maxLength={7}
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Accent Color</label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={data.accent_color}
              onChange={(e) => {
                onChange({ accent_color: e.target.value })
                onLivePreview(data.primary_color, e.target.value)
              }}
              className="w-10 h-10 p-0.5 border border-gray-300 rounded-lg cursor-pointer"
            />
            <input
              type="text"
              value={data.accent_color}
              onChange={(e) => {
                if (/^#[0-9A-Fa-f]{0,6}$/.test(e.target.value)) {
                  onChange({ accent_color: e.target.value })
                  if (e.target.value.length === 7) onLivePreview(data.primary_color, e.target.value)
                }
              }}
              className="flex-1 text-xs font-mono border border-gray-200 rounded-lg px-2 py-2 bg-gray-50"
              maxLength={7}
            />
          </div>
        </div>
      </div>

      {/* Live preview chip */}
      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
        <span className="text-xs text-gray-500">Preview:</span>
        <span
          style={{ background: data.primary_color }}
          className="px-3 py-1 rounded-full text-white text-xs font-medium"
        >
          Primary
        </span>
        <span
          style={{ background: data.accent_color }}
          className="px-3 py-1 rounded-full text-white text-xs font-medium"
        >
          Accent
        </span>
      </div>
    </section>
  )
}

export function AppearanceForm({
  adminTheme,
  salesmanTheme,
}: {
  adminTheme: ThemeSettings | null
  salesmanTheme: ThemeSettings | null
}) {
  const [adminData, setAdminData] = useState<PortalTheme>({
    primary_color: adminTheme?.primary_color || '#4F46E5',
    accent_color: adminTheme?.accent_color || '#10B981',
    theme_mode: adminTheme?.theme_mode || 'system',
  })
  const [salesmanData, setSalesmanData] = useState<PortalTheme>({
    primary_color: salesmanTheme?.primary_color || '#2563EB',
    accent_color: salesmanTheme?.accent_color || '#059669',
    theme_mode: salesmanTheme?.theme_mode || 'system',
  })
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Live-preview helper: directly set CSS vars for instant feedback
  const applyLivePreview = useCallback((primary: string, accent: string) => {
    if (typeof window === 'undefined') return
    const { h: ph, s: ps, l: pl } = hexToHSL(primary)
    const { h: ah, s: as_, l: al } = hexToHSL(accent)
    const root = document.documentElement
    root.style.setProperty('--primary', `${ph} ${ps}% ${pl}%`)
    root.style.setProperty('--ring', `${ph} ${ps}% ${pl}%`)
    root.style.setProperty('--accent', `${ah} ${as_}% ${al}%`)
    const shades: [string, number][] = [
      ['--brand-50', 97], ['--brand-100', 92], ['--brand-200', 84],
      ['--brand-300', 74], ['--brand-400', 62], ['--brand-500', 50],
      ['--brand-600', 40], ['--brand-700', 32], ['--brand-800', 22], ['--brand-900', 14],
    ]
    shades.forEach(([v, l]) => root.style.setProperty(v, `${ph} ${ps}% ${l}%`))
  }, [])

  async function handleSave() {
    setLoading(true)
    setMessage(null)
    try {
      const r1 = await updateThemeSettings('admin', adminData)
      if (!r1?.success) throw new Error(r1?.error || 'Failed to update admin theme')

      const r2 = await updateThemeSettings('salesman', salesmanData)
      if (!r2?.success) throw new Error(r2?.error || 'Failed to update salesman theme')

      setMessage({ type: 'success', text: 'Themes saved successfully! Changes are live across the app.' })
    } catch (e: any) {
      console.error(e)
      setMessage({ type: 'error', text: e.message || 'Failed to save themes' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <ColorSection
        label="Admin Portal Theme"
        data={adminData}
        onChange={(patch) => setAdminData((prev) => ({ ...prev, ...patch }))}
        onLivePreview={applyLivePreview}
      />
      <ColorSection
        label="Salesman Portal Theme"
        data={salesmanData}
        onChange={(patch) => setSalesmanData((prev) => ({ ...prev, ...patch }))}
        onLivePreview={applyLivePreview}
      />

      {message && (
        <div
          className={`p-3 rounded-lg text-sm font-medium ${
            message.type === 'success'
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={loading}
          className="px-6 py-2.5 bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50 font-medium transition-colors text-sm"
        >
          {loading ? 'Saving...' : 'Save Appearance'}
        </button>
      </div>
    </div>
  )
}
