// ============================================================
// Sales Academy -- Theme Preset Registry
// All built-in theme packs: gradient, solid, galaxy, custom
// ============================================================

export type ThemePreset = {
  id: string
  name: string
  category: 'gradient' | 'solid' | 'galaxy' | 'custom'
  primary_color: string
  accent_color: string
  gradient_css?: string
  sidebar_gradient_css?: string
  theme_mode?: 'light' | 'dark' | 'system'
  /** 2-3 hex colors used to render the swatch thumbnail */
  preview_colors: string[]
  description?: string
}

// ---------------------------------------------------------------------------
// GRADIENT PRESETS -- 10 professionally designed gradient packs
// ---------------------------------------------------------------------------
export const GRADIENT_PRESETS: ThemePreset[] = [
  {
    id: 'gradient-ocean',
    name: 'Ocean Breeze',
    category: 'gradient',
    primary_color: '#0284C7',
    accent_color: '#06B6D4',
    gradient_css: 'linear-gradient(135deg, #0c4a6e 0%, #075985 40%, #0e7490 100%)',
    sidebar_gradient_css: 'linear-gradient(180deg, #0c4a6e 0%, #075985 60%, #0e7490 100%)',
    preview_colors: ['#0c4a6e', '#075985', '#06B6D4'],
    description: 'Deep ocean blues with cyan accents',
  },
  {
    id: 'gradient-sunset',
    name: 'Sunset Glow',
    category: 'gradient',
    primary_color: '#DC2626',
    accent_color: '#F97316',
    gradient_css: 'linear-gradient(135deg, #7f1d1d 0%, #991b1b 35%, #c2410c 70%, #ea580c 100%)',
    sidebar_gradient_css: 'linear-gradient(180deg, #7f1d1d 0%, #991b1b 50%, #c2410c 100%)',
    preview_colors: ['#7f1d1d', '#c2410c', '#f97316'],
    description: 'Warm reds blending into deep orange',
  },
  {
    id: 'gradient-aurora',
    name: 'Aurora Borealis',
    category: 'gradient',
    primary_color: '#059669',
    accent_color: '#8B5CF6',
    gradient_css: 'linear-gradient(135deg, #064e3b 0%, #065f46 30%, #4c1d95 70%, #5b21b6 100%)',
    sidebar_gradient_css: 'linear-gradient(180deg, #064e3b 0%, #065f46 40%, #4c1d95 100%)',
    preview_colors: ['#064e3b', '#4c1d95', '#8B5CF6'],
    description: 'Emerald greens melting into deep violet',
  },
  {
    id: 'gradient-midnight',
    name: 'Midnight Purple',
    category: 'gradient',
    primary_color: '#7C3AED',
    accent_color: '#EC4899',
    gradient_css: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 40%, #4c1d95 70%, #6d28d9 100%)',
    sidebar_gradient_css: 'linear-gradient(180deg, #1e1b4b 0%, #312e81 50%, #4c1d95 100%)',
    preview_colors: ['#1e1b4b', '#4c1d95', '#7C3AED'],
    description: 'Rich indigo depths with electric violet',
  },
  {
    id: 'gradient-rose-gold',
    name: 'Rose Gold',
    category: 'gradient',
    primary_color: '#DB2777',
    accent_color: '#F59E0B',
    gradient_css: 'linear-gradient(135deg, #831843 0%, #9d174d 35%, #b45309 70%, #d97706 100%)',
    sidebar_gradient_css: 'linear-gradient(180deg, #831843 0%, #9d174d 50%, #b45309 100%)',
    preview_colors: ['#831843', '#9d174d', '#d97706'],
    description: 'Luxurious rose blending into warm gold',
  },
  {
    id: 'gradient-tropical',
    name: 'Tropical Teal',
    category: 'gradient',
    primary_color: '#0D9488',
    accent_color: '#84CC16',
    gradient_css: 'linear-gradient(135deg, #134e4a 0%, #0f766e 40%, #166534 70%, #15803d 100%)',
    sidebar_gradient_css: 'linear-gradient(180deg, #134e4a 0%, #0f766e 50%, #166534 100%)',
    preview_colors: ['#134e4a', '#0f766e', '#15803d'],
    description: 'Tropical teal flowing into lush greens',
  },
  {
    id: 'gradient-crimson-sky',
    name: 'Crimson Sky',
    category: 'gradient',
    primary_color: '#9F1239',
    accent_color: '#7C3AED',
    gradient_css: 'linear-gradient(135deg, #4a044e 0%, #7e1065 35%, #881337 70%, #9f1239 100%)',
    sidebar_gradient_css: 'linear-gradient(180deg, #4a044e 0%, #7e1065 50%, #881337 100%)',
    preview_colors: ['#4a044e', '#7e1065', '#9f1239'],
    description: 'Deep magenta shifting to ruby red',
  },
  {
    id: 'gradient-forest',
    name: 'Forest Mist',
    category: 'gradient',
    primary_color: '#16A34A',
    accent_color: '#0284C7',
    gradient_css: 'linear-gradient(135deg, #14532d 0%, #166534 35%, #1e3a5f 70%, #1e40af 100%)',
    sidebar_gradient_css: 'linear-gradient(180deg, #14532d 0%, #166534 50%, #1e3a5f 100%)',
    preview_colors: ['#14532d', '#166534', '#1e40af'],
    description: 'Deep forest green meeting midnight blue',
  },
  {
    id: 'gradient-golden',
    name: 'Golden Hour',
    category: 'gradient',
    primary_color: '#D97706',
    accent_color: '#DC2626',
    gradient_css: 'linear-gradient(135deg, #78350f 0%, #92400e 35%, #b45309 65%, #d97706 100%)',
    sidebar_gradient_css: 'linear-gradient(180deg, #78350f 0%, #92400e 50%, #b45309 100%)',
    preview_colors: ['#78350f', '#b45309', '#d97706'],
    description: 'Rich amber with warm golden tones',
  },
  {
    id: 'gradient-violet-storm',
    name: 'Violet Storm',
    category: 'gradient',
    primary_color: '#6D28D9',
    accent_color: '#0284C7',
    gradient_css: 'linear-gradient(135deg, #1e1b4b 0%, #2e1065 35%, #1e3a5f 70%, #0c4a6e 100%)',
    sidebar_gradient_css: 'linear-gradient(180deg, #1e1b4b 0%, #2e1065 50%, #0c4a6e 100%)',
    preview_colors: ['#1e1b4b', '#2e1065', '#0c4a6e'],
    description: 'Stormy violet merging into deep blue',
  },
]

// ---------------------------------------------------------------------------
// SOLID / FLAT PRESETS -- curated well-matched color combos
// ---------------------------------------------------------------------------
export const SOLID_PRESETS: ThemePreset[] = [
  { id: 'solid-indigo',   name: 'Indigo',        category: 'solid', primary_color: '#4F46E5', accent_color: '#10B981', preview_colors: ['#4F46E5', '#10B981'] },
  { id: 'solid-ocean',    name: 'Ocean Blue',    category: 'solid', primary_color: '#2563EB', accent_color: '#06B6D4', preview_colors: ['#2563EB', '#06B6D4'] },
  { id: 'solid-forest',   name: 'Forest',        category: 'solid', primary_color: '#16A34A', accent_color: '#84CC16', preview_colors: ['#16A34A', '#84CC16'] },
  { id: 'solid-royal',    name: 'Royal Purple',  category: 'solid', primary_color: '#7C3AED', accent_color: '#EC4899', preview_colors: ['#7C3AED', '#EC4899'] },
  { id: 'solid-teal',     name: 'Teal',          category: 'solid', primary_color: '#0D9488', accent_color: '#3B82F6', preview_colors: ['#0D9488', '#3B82F6'] },
  { id: 'solid-crimson',  name: 'Crimson',       category: 'solid', primary_color: '#DC2626', accent_color: '#F59E0B', preview_colors: ['#DC2626', '#F59E0B'] },
  { id: 'solid-charcoal', name: 'Charcoal',      category: 'solid', primary_color: '#374151', accent_color: '#6366F1', preview_colors: ['#374151', '#6366F1'] },
  { id: 'solid-navy',     name: 'Navy',          category: 'solid', primary_color: '#1E3A5F', accent_color: '#38BDF8', preview_colors: ['#1E3A5F', '#38BDF8'] },
  { id: 'solid-rose',     name: 'Rose',          category: 'solid', primary_color: '#E11D48', accent_color: '#A855F7', preview_colors: ['#E11D48', '#A855F7'] },
  { id: 'solid-amber',    name: 'Amber',         category: 'solid', primary_color: '#D97706', accent_color: '#10B981', preview_colors: ['#D97706', '#10B981'] },
]

// ---------------------------------------------------------------------------
// GALAXY -- special dark cosmic preset
// ---------------------------------------------------------------------------
export const GALAXY_PRESET: ThemePreset = {
  id: 'galaxy',
  name: 'Galaxy',
  category: 'galaxy',
  primary_color: '#7C3AED',
  accent_color: '#38BDF8',
  gradient_css: 'linear-gradient(135deg, #0a0014 0%, #0f0a2e 30%, #0d1b4b 60%, #0a0028 100%)',
  sidebar_gradient_css: 'linear-gradient(180deg, #0a0014 0%, #110a35 40%, #0d1b4b 80%, #070024 100%)',
  theme_mode: 'dark',
  preview_colors: ['#0a0014', '#7C3AED', '#38BDF8'],
  description: 'Deep cosmic dark with purple nebula tones',
}

// ---------------------------------------------------------------------------
// CUSTOM -- placeholder
// ---------------------------------------------------------------------------
export const CUSTOM_PRESET: ThemePreset = {
  id: 'custom',
  name: 'Custom',
  category: 'custom',
  primary_color: '#4F46E5',
  accent_color: '#10B981',
  preview_colors: ['#4F46E5', '#10B981'],
  description: 'Choose your own colors',
}

export const ALL_PRESETS: ThemePreset[] = [
  ...GRADIENT_PRESETS,
  ...SOLID_PRESETS,
  GALAXY_PRESET,
  CUSTOM_PRESET,
]

export function findPreset(id: string): ThemePreset | undefined {
  return ALL_PRESETS.find((p) => p.id === id)
}
