'use client'

import { useState, useRef } from 'react'
import { ThemeSettings } from '@/types'
import { updateThemeSettings, uploadThemeWallpaper } from '@/lib/actions/theme'
import { hexToHSL } from '@/lib/utils/themeUtils'
import {
  GRADIENT_PRESETS,
  SOLID_PRESETS,
  GALAXY_PRESET,
  findPreset,
  ThemePreset,
} from '@/lib/theme-presets'
import { Upload, Trash2, Check } from 'lucide-react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type PortalTheme = {
  primary_color: string
  accent_color: string
  theme_mode: 'system' | 'light' | 'dark'
  theme_preset: string
  gradient_css: string | null
  sidebar_gradient_css: string | null
  wallpaper_url: string | null
  wallpaper_opacity: number
  card_opacity: number
}

function themeFromSettings(s: ThemeSettings | null, defaults: PortalTheme): PortalTheme {
  if (!s) return defaults
  return {
    primary_color: s.primary_color || defaults.primary_color,
    accent_color: s.accent_color || defaults.accent_color,
    theme_mode: s.theme_mode || 'system',
    theme_preset: s.theme_preset || 'custom',
    gradient_css: s.gradient_css || null,
    sidebar_gradient_css: s.sidebar_gradient_css || null,
    wallpaper_url: s.wallpaper_url || null,
    wallpaper_opacity: s.wallpaper_opacity ?? 0.15,
    card_opacity: s.card_opacity ?? 1.0,
  }
}

function applyLivePreview(preset: ThemePreset | null, primary: string, accent: string) {
  if (typeof window === 'undefined') return
  const { h: ph, s: ps, l: pl } = hexToHSL(primary)
  const { h: ah, s: as_, l: al } = hexToHSL(accent)
  const root = document.documentElement
  root.style.setProperty('--primary', ph + ' ' + ps + '% ' + pl + '%')
  root.style.setProperty('--ring', ph + ' ' + ps + '% ' + pl + '%')
  root.style.setProperty('--accent', ah + ' ' + as_ + '% ' + al + '%')
  const shades: [string, number][] = [
    ['--brand-50', 97], ['--brand-100', 92], ['--brand-200', 84],
    ['--brand-300', 74], ['--brand-400', 62], ['--brand-500', 50],
    ['--brand-600', 40], ['--brand-700', 32], ['--brand-800', 22], ['--brand-900', 14],
  ]
  shades.forEach(([v, l]) => root.style.setProperty(v, ph + ' ' + ps + '% ' + l + '%'))

  if (preset?.gradient_css) {
    document.body.style.background = preset.gradient_css
    root.style.setProperty('--sidebar-gradient', preset.sidebar_gradient_css || preset.gradient_css)
  } else {
    document.body.style.removeProperty('background')
    root.style.setProperty('--sidebar-gradient',
      'linear-gradient(to bottom, hsl(' + ph + ' ' + ps + '% 22%), hsl(' + ph + ' ' + ps + '% 14%))')
  }

  if (preset?.id === 'galaxy') {
    root.classList.add('galaxy-theme')
  } else {
    root.classList.remove('galaxy-theme')
  }
}

// ---------------------------------------------------------------------------
// GradientCard
// ---------------------------------------------------------------------------
function GradientCard({ preset, isSelected, onClick }: {
  preset: ThemePreset; isSelected: boolean; onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      title={preset.name}
      className={'relative rounded-xl overflow-hidden h-20 w-full text-left transition-all hover:scale-[1.02] hover:shadow-lg ' + (isSelected ? 'ring-2 ring-offset-2 ring-gray-800 scale-[1.02] shadow-lg' : 'ring-1 ring-gray-200')}
      style={{ background: preset.gradient_css || preset.primary_color }}
    >
      {isSelected && (
        <div className="absolute top-1.5 right-1.5 w-5 h-5 bg-white rounded-full flex items-center justify-center shadow">
          <Check className="w-3 h-3 text-gray-800" />
        </div>
      )}
      <div className="absolute bottom-0 inset-x-0 p-2 bg-gradient-to-t from-black/60 to-transparent">
        <p className="text-white text-xs font-semibold truncate">{preset.name}</p>
        {preset.description && <p className="text-white/70 text-[10px] truncate">{preset.description}</p>}
      </div>
    </button>
  )
}

// ---------------------------------------------------------------------------
// SolidCard
// ---------------------------------------------------------------------------
function SolidCard({ preset, isSelected, onClick }: {
  preset: ThemePreset; isSelected: boolean; onClick: () => void
}) {
  const [p1, p2] = preset.preview_colors
  return (
    <button
      onClick={onClick}
      title={preset.name}
      className={'relative rounded-xl overflow-hidden h-14 w-full transition-all hover:scale-[1.03] hover:shadow-md ' + (isSelected ? 'ring-2 ring-offset-2 ring-gray-800 scale-[1.03]' : 'ring-1 ring-gray-200')}
    >
      <div className="absolute inset-0 flex">
        <div className="flex-1" style={{ background: p1 }} />
        <div className="flex-1" style={{ background: p2 }} />
      </div>
      {isSelected && (
        <div className="absolute top-1 right-1 w-4 h-4 bg-white rounded-full flex items-center justify-center shadow">
          <Check className="w-2.5 h-2.5 text-gray-800" />
        </div>
      )}
      <div className="absolute bottom-0 inset-x-0 px-1.5 pb-1 bg-gradient-to-t from-black/40 to-transparent">
        <p className="text-white text-[10px] font-semibold truncate">{preset.name}</p>
      </div>
    </button>
  )
}

// ---------------------------------------------------------------------------
// GalaxyCard
// ---------------------------------------------------------------------------
function GalaxyCard({ isSelected, onClick }: { isSelected: boolean; onClick: () => void }) {
  const stars = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    top: (i * 37 + 5) % 90,
    left: (i * 53 + 10) % 90,
    size: i % 3 === 0 ? 2 : 1,
    opacity: 0.4 + (i % 5) * 0.12,
  }))

  return (
    <button
      onClick={onClick}
      className={'relative w-full rounded-xl overflow-hidden h-28 transition-all hover:scale-[1.01] hover:shadow-xl ' + (isSelected ? 'ring-2 ring-offset-2 ring-purple-400 scale-[1.01]' : 'ring-1 ring-gray-700')}
      style={{ background: 'linear-gradient(135deg, #0a0014 0%, #0f0a2e 30%, #0d1b4b 60%, #0a0028 100%)' }}
    >
      {stars.map(s => (
        <div
          key={s.id}
          className="absolute rounded-full bg-white"
          style={{ width: s.size, height: s.size, top: s.top + '%', left: s.left + '%', opacity: s.opacity }}
        />
      ))}
      <div className="absolute inset-0" style={{
        background: 'radial-gradient(ellipse 60% 50% at 30% 40%, rgba(120,60,237,0.25) 0%, transparent 70%), radial-gradient(ellipse 40% 35% at 70% 60%, rgba(56,189,248,0.15) 0%, transparent 70%)'
      }} />
      {isSelected && (
        <div className="absolute top-2 right-2 w-5 h-5 bg-white rounded-full flex items-center justify-center shadow">
          <Check className="w-3 h-3 text-gray-800" />
        </div>
      )}
      <div className="absolute bottom-0 inset-x-0 p-3">
        <p className="text-white font-bold text-sm">Galaxy</p>
        <p className="text-purple-300 text-xs">Deep cosmic dark theme with star field</p>
      </div>
    </button>
  )
}

// ---------------------------------------------------------------------------
// WallpaperSection
// ---------------------------------------------------------------------------
function WallpaperSection({
  wallpaperUrl, wallpaperOpacity, cardOpacity,
  onWallpaperChange, onOpacityChange, onCardOpacityChange,
}: {
  wallpaperUrl: string | null
  wallpaperOpacity: number
  cardOpacity: number
  onWallpaperChange: (url: string | null) => void
  onOpacityChange: (v: number) => void
  onCardOpacityChange: (v: number) => void
}) {
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setUploadError(null)
    const fd = new FormData()
    fd.append('file', file)
    const result = await uploadThemeWallpaper(fd)
    setUploading(false)
    if ('error' in result) {
      setUploadError(result.error)
    } else {
      onWallpaperChange(result.url)
    }
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <div className="space-y-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
      <p className="text-sm font-semibold text-gray-700">Custom Wallpaper (optional)</p>

      {wallpaperUrl ? (
        <div className="flex items-center gap-3">
          <div className="relative w-24 h-16 rounded-lg overflow-hidden border border-gray-200 flex-shrink-0">
            <img src={wallpaperUrl} alt="Wallpaper preview" className="w-full h-full object-cover" />
          </div>
          <div className="flex-1 space-y-1">
            <p className="text-xs text-gray-500 truncate">Wallpaper set</p>
            <button
              onClick={() => onWallpaperChange(null)}
              className="flex items-center gap-1 text-xs text-red-600 hover:text-red-700"
            >
              <Trash2 className="w-3 h-3" /> Remove
            </button>
          </div>
        </div>
      ) : (
        <div
          onClick={() => fileRef.current?.click()}
          className="flex flex-col items-center justify-center gap-2 h-20 rounded-xl border-2 border-dashed border-gray-300 hover:border-brand-400 cursor-pointer transition-colors"
        >
          {uploading ? (
            <div className="text-xs text-gray-500 animate-pulse">Uploading...</div>
          ) : (
            <>
              <Upload className="w-5 h-5 text-gray-400" />
              <p className="text-xs text-gray-500">Click to upload wallpaper (max 5MB)</p>
            </>
          )}
        </div>
      )}

      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
      {uploadError && <p className="text-xs text-red-600">{uploadError}</p>}

      {wallpaperUrl && (
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-medium text-gray-600">Wallpaper Opacity</label>
            <span className="text-xs text-gray-400">{Math.round(wallpaperOpacity * 100)}%</span>
          </div>
          <input
            type="range" min={0} max={1} step={0.05}
            value={wallpaperOpacity}
            onChange={e => onOpacityChange(Number(e.target.value))}
            className="w-full accent-brand-600"
          />
        </div>
      )}

      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-xs font-medium text-gray-600">Content Card Background</label>
          <span className="text-xs text-gray-400">{Math.round(cardOpacity * 100)}%</span>
        </div>
        <input
          type="range" min={0.3} max={1} step={0.05}
          value={cardOpacity}
          onChange={e => onCardOpacityChange(Number(e.target.value))}
          className="w-full accent-brand-600"
        />
        <p className="text-[10px] text-gray-400 mt-1">Lower = more transparent cards (best with wallpaper or gradient themes)</p>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// ThemeSection
// ---------------------------------------------------------------------------
type TabKey = 'gradient' | 'solid' | 'galaxy' | 'custom'

function ThemeSection({ label, data, onChange }: {
  label: string
  data: PortalTheme
  onChange: (patch: Partial<PortalTheme>) => void
}) {
  const activeCategory: TabKey = (() => {
    if (data.theme_preset === 'galaxy') return 'galaxy'
    if (data.theme_preset === 'custom' || !data.theme_preset) return 'custom'
    if (GRADIENT_PRESETS.find(p => p.id === data.theme_preset)) return 'gradient'
    return 'solid'
  })()
  const [tab, setTab] = useState<TabKey>(activeCategory)

  function applyPreset(preset: ThemePreset) {
    onChange({
      theme_preset: preset.id,
      primary_color: preset.primary_color,
      accent_color: preset.accent_color,
      gradient_css: preset.gradient_css || null,
      sidebar_gradient_css: preset.sidebar_gradient_css || null,
      theme_mode: preset.theme_mode || 'system',
    })
    applyLivePreview(preset, preset.primary_color, preset.accent_color)
  }

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'gradient', label: 'Gradients' },
    { key: 'solid', label: 'Solid' },
    { key: 'galaxy', label: 'Galaxy' },
    { key: 'custom', label: 'Custom' },
  ]

  return (
    <section className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="p-5 border-b border-gray-100">
        <h2 className="text-base font-semibold text-gray-900">{label}</h2>
      </div>

      <div className="flex gap-1 p-3 bg-gray-50 border-b border-gray-100">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={'px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ' + (tab === t.key ? 'bg-white shadow-sm text-gray-900 border border-gray-200' : 'text-gray-500 hover:text-gray-700 hover:bg-white/60')}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="p-5 space-y-5">
        {tab === 'gradient' && (
          <div className="grid grid-cols-2 gap-3">
            {GRADIENT_PRESETS.map(preset => (
              <GradientCard
                key={preset.id}
                preset={preset}
                isSelected={data.theme_preset === preset.id}
                onClick={() => applyPreset(preset)}
              />
            ))}
          </div>
        )}

        {tab === 'solid' && (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
            {SOLID_PRESETS.map(preset => (
              <SolidCard
                key={preset.id}
                preset={preset}
                isSelected={data.theme_preset === preset.id}
                onClick={() => applyPreset(preset)}
              />
            ))}
          </div>
        )}

        {tab === 'galaxy' && (
          <div className="space-y-4">
            <GalaxyCard
              isSelected={data.theme_preset === 'galaxy'}
              onClick={() => applyPreset(GALAXY_PRESET)}
            />
            <p className="text-xs text-gray-500">
              The Galaxy theme applies a dark cosmic background with an animated star field and nebula effect.
              It automatically sets the portal to <strong>dark mode</strong>.
            </p>
          </div>
        )}

        {tab === 'custom' && (
          <div className="space-y-4">
            <p className="text-xs text-gray-500">Pick any colors. The sidebar and buttons will use these colors.</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Primary Color</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={data.primary_color}
                    onChange={e => {
                      onChange({ primary_color: e.target.value, theme_preset: 'custom', gradient_css: null })
                      applyLivePreview(null, e.target.value, data.accent_color)
                    }}
                    className="w-10 h-10 p-0.5 border border-gray-300 rounded-lg cursor-pointer"
                  />
                  <input
                    type="text"
                    value={data.primary_color}
                    onChange={e => {
                      if (/^#[0-9A-Fa-f]{0,6}$/.test(e.target.value)) {
                        onChange({ primary_color: e.target.value, theme_preset: 'custom', gradient_css: null })
                        if (e.target.value.length === 7) applyLivePreview(null, e.target.value, data.accent_color)
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
                    onChange={e => {
                      onChange({ accent_color: e.target.value })
                      applyLivePreview(null, data.primary_color, e.target.value)
                    }}
                    className="w-10 h-10 p-0.5 border border-gray-300 rounded-lg cursor-pointer"
                  />
                  <input
                    type="text"
                    value={data.accent_color}
                    onChange={e => {
                      if (/^#[0-9A-Fa-f]{0,6}$/.test(e.target.value)) {
                        onChange({ accent_color: e.target.value })
                        if (e.target.value.length === 7) applyLivePreview(null, data.primary_color, e.target.value)
                      }
                    }}
                    className="flex-1 text-xs font-mono border border-gray-200 rounded-lg px-2 py-2 bg-gray-50"
                    maxLength={7}
                  />
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <span className="text-xs text-gray-500">Preview:</span>
              <span style={{ background: data.primary_color }} className="px-3 py-1 rounded-full text-white text-xs font-medium">Primary</span>
              <span style={{ background: data.accent_color }} className="px-3 py-1 rounded-full text-white text-xs font-medium">Accent</span>
            </div>
          </div>
        )}

        <WallpaperSection
          wallpaperUrl={data.wallpaper_url}
          wallpaperOpacity={data.wallpaper_opacity}
          cardOpacity={data.card_opacity}
          onWallpaperChange={url => onChange({ wallpaper_url: url })}
          onOpacityChange={v => onChange({ wallpaper_opacity: v })}
          onCardOpacityChange={v => onChange({ card_opacity: v })}
        />

        <div className="text-xs text-gray-400 pt-1">
          {(() => {
            const preset = findPreset(data.theme_preset)
            return preset ? ('Active: ' + preset.name) : ('Active: Custom (' + data.primary_color + ')')
          })()}
        </div>
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------------
// AppearanceForm
// ---------------------------------------------------------------------------
const adminDefaults: PortalTheme = {
  primary_color: '#4F46E5', accent_color: '#10B981', theme_mode: 'system',
  theme_preset: 'custom', gradient_css: null, sidebar_gradient_css: null,
  wallpaper_url: null, wallpaper_opacity: 0.15, card_opacity: 1.0,
}
const salesmanDefaults: PortalTheme = {
  primary_color: '#2563EB', accent_color: '#059669', theme_mode: 'system',
  theme_preset: 'custom', gradient_css: null, sidebar_gradient_css: null,
  wallpaper_url: null, wallpaper_opacity: 0.15, card_opacity: 1.0,
}

export function AppearanceForm({
  adminTheme,
  salesmanTheme,
}: {
  adminTheme: ThemeSettings | null
  salesmanTheme: ThemeSettings | null
}) {
  const [adminData, setAdminData] = useState<PortalTheme>(themeFromSettings(adminTheme, adminDefaults))
  const [salesmanData, setSalesmanData] = useState<PortalTheme>(themeFromSettings(salesmanTheme, salesmanDefaults))
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  async function handleSave() {
    setLoading(true)
    setMessage(null)
    try {
      const r1 = await updateThemeSettings('admin', adminData as any)
      if (!r1?.success) throw new Error((r1 as any)?.error || 'Failed to update admin theme')
      const r2 = await updateThemeSettings('salesman', salesmanData as any)
      if (!r2?.success) throw new Error((r2 as any)?.error || 'Failed to update salesman theme')
      setMessage({ type: 'success', text: 'Themes saved! Changes are live across both portals.' })
    } catch (e: any) {
      setMessage({ type: 'error', text: e.message || 'Failed to save themes' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <ThemeSection
        label="Admin Portal Theme"
        data={adminData}
        onChange={patch => setAdminData(prev => ({ ...prev, ...patch }))}
      />
      <ThemeSection
        label="Salesman Portal Theme"
        data={salesmanData}
        onChange={patch => setSalesmanData(prev => ({ ...prev, ...patch }))}
      />

      {message && (
        <div className={'p-3 rounded-lg text-sm font-medium ' + (message.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200')}>
          {message.text}
        </div>
      )}

      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={loading}
          className="px-6 py-2.5 bg-brand-600 text-white rounded-xl hover:bg-brand-700 disabled:opacity-50 font-medium transition-colors text-sm shadow-sm"
        >
          {loading ? 'Saving...' : 'Save Themes'}
        </button>
      </div>
    </div>
  )
}
