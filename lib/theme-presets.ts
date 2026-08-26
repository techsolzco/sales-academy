// ============================================================
// Sales Academy -- Theme Preset Registry
// 7 gradient presets (color-theory driven) + 5 cosmic presets
// ============================================================

export type ThemePreset = {
  id: string
  name: string
  category: 'gradient' | 'solid' | 'cosmic' | 'custom'
  primary_color: string
  accent_color: string
  gradient_css?: string
  /** For cosmic themes: stores the nebula radial-gradient overlay string */
  sidebar_gradient_css?: string
  theme_mode?: 'light' | 'dark' | 'system'
  preview_colors: string[]
  description?: string
}

// ---------------------------------------------------------------------------
// GRADIENT PRESETS -- 7 curated, color-theory-driven packs
// Hue shift: 20-58 degrees (analogous). All stops dark enough for white text.
// ---------------------------------------------------------------------------
export const GRADIENT_PRESETS: ThemePreset[] = [
  {
    id: 'gradient-coastal',
    name: 'Coastal',
    category: 'gradient',
    primary_color: '#0284C7',
    accent_color: '#22D3EE',
    // Analogous blue -> teal, hue shift ~22deg. Calm, professional, Stripe-level.
    gradient_css: 'linear-gradient(135deg, #0d3d6b 0%, #0a546e 50%, #0a6b7a 100%)',
    sidebar_gradient_css: 'linear-gradient(180deg, #082e50 0%, #083f52 60%, #085260 100%)',
    preview_colors: ['#0d3d6b', '#0a546e', '#0a6b7a'],
    description: 'Deep navy to ocean blue, calm and trustworthy',
  },
  {
    id: 'gradient-verdant',
    name: 'Verdant',
    category: 'gradient',
    primary_color: '#059669',
    accent_color: '#34D399',
    // Analogous forest green -> dark teal, hue shift ~37deg. Nature meets tech.
    gradient_css: 'linear-gradient(135deg, #0a3d24 0%, #083530 50%, #0a3d45 100%)',
    sidebar_gradient_css: 'linear-gradient(180deg, #072e1a 0%, #062822 60%, #082e36 100%)',
    preview_colors: ['#0a3d24', '#083530', '#0a3d45'],
    description: 'Forest green into dark teal, sophisticated and fresh',
  },
  {
    id: 'gradient-plum',
    name: 'Plum Depth',
    category: 'gradient',
    primary_color: '#7C3AED',
    accent_color: '#818CF8',
    // Analogous violet -> indigo, hue shift ~31deg. Premium, Notion/Linear feel.
    gradient_css: 'linear-gradient(135deg, #1e0a4a 0%, #160f50 50%, #0f1650 100%)',
    sidebar_gradient_css: 'linear-gradient(180deg, #160738 0%, #0f0c3d 60%, #0a1240 100%)',
    preview_colors: ['#1e0a4a', '#160f50', '#0f1650'],
    description: 'Deep violet into indigo, premium and precise',
  },
  {
    id: 'gradient-garnet',
    name: 'Garnet',
    category: 'gradient',
    primary_color: '#BE185D',
    accent_color: '#E879F9',
    // Analogous rose -> violet, hue shift ~58deg. Elegant, luxury brand feel.
    gradient_css: 'linear-gradient(135deg, #4a0d2d 0%, #380d3c 50%, #2a0d4a 100%)',
    sidebar_gradient_css: 'linear-gradient(180deg, #380a22 0%, #2c0a30 60%, #200a38 100%)',
    preview_colors: ['#4a0d2d', '#380d3c', '#2a0d4a'],
    description: 'Rose to violet, elegant and luxurious',
  },
  {
    id: 'gradient-obsidian',
    name: 'Obsidian',
    category: 'gradient',
    primary_color: '#6366F1',
    accent_color: '#A5B4FC',
    // Analogous blue-grey -> near-black, hue shift ~9deg. Ultra-minimal, Vercel-dark.
    gradient_css: 'linear-gradient(135deg, #111827 0%, #0f1520 50%, #0d1520 100%)',
    sidebar_gradient_css: 'linear-gradient(180deg, #0d1320 0%, #0a1018 60%, #08101a 100%)',
    preview_colors: ['#111827', '#0f1520', '#0d1520'],
    description: 'Near-black blue-slate, ultra-minimal and clean',
  },
  {
    id: 'gradient-ember',
    name: 'Ember',
    category: 'gradient',
    primary_color: '#DC2626',
    accent_color: '#FB923C',
    // Analogous amber -> dark crimson, hue shift ~31deg. Bold, warm, energetic.
    gradient_css: 'linear-gradient(135deg, #3d1206 0%, #3d1010 50%, #3d0d17 100%)',
    sidebar_gradient_css: 'linear-gradient(180deg, #2e0d04 0%, #2e0c0c 60%, #2e0a12 100%)',
    preview_colors: ['#3d1206', '#3d1010', '#3d0d17'],
    description: 'Amber into crimson, bold and energetic',
  },
  {
    id: 'gradient-sage',
    name: 'Sage & Slate',
    category: 'gradient',
    primary_color: '#0D9488',
    accent_color: '#67E8F9',
    // Analogous dark teal -> slate navy, hue shift ~43deg. Calm SaaS, Intercom/Atlassian.
    gradient_css: 'linear-gradient(135deg, #0a2d2a 0%, #0a2835 50%, #0f1f3d 100%)',
    sidebar_gradient_css: 'linear-gradient(180deg, #072220 0%, #072030 60%, #0b182e 100%)',
    preview_colors: ['#0a2d2a', '#0a2835', '#0f1f3d'],
    description: 'Dark teal into slate navy, calm and dependable',
  },
]

// ---------------------------------------------------------------------------
// SOLID PRESETS -- curated well-matched pairs
// ---------------------------------------------------------------------------
export const SOLID_PRESETS: ThemePreset[] = [
  { id: 'solid-indigo',   name: 'Indigo',       category: 'solid', primary_color: '#4F46E5', accent_color: '#10B981', preview_colors: ['#4F46E5', '#10B981'] },
  { id: 'solid-ocean',    name: 'Ocean Blue',   category: 'solid', primary_color: '#2563EB', accent_color: '#06B6D4', preview_colors: ['#2563EB', '#06B6D4'] },
  { id: 'solid-forest',   name: 'Forest',       category: 'solid', primary_color: '#16A34A', accent_color: '#84CC16', preview_colors: ['#16A34A', '#84CC16'] },
  { id: 'solid-royal',    name: 'Royal Purple', category: 'solid', primary_color: '#7C3AED', accent_color: '#EC4899', preview_colors: ['#7C3AED', '#EC4899'] },
  { id: 'solid-teal',     name: 'Teal',         category: 'solid', primary_color: '#0D9488', accent_color: '#3B82F6', preview_colors: ['#0D9488', '#3B82F6'] },
  { id: 'solid-crimson',  name: 'Crimson',      category: 'solid', primary_color: '#DC2626', accent_color: '#F59E0B', preview_colors: ['#DC2626', '#F59E0B'] },
  { id: 'solid-charcoal', name: 'Charcoal',     category: 'solid', primary_color: '#374151', accent_color: '#6366F1', preview_colors: ['#374151', '#6366F1'] },
  { id: 'solid-navy',     name: 'Navy',         category: 'solid', primary_color: '#1E3A5F', accent_color: '#38BDF8', preview_colors: ['#1E3A5F', '#38BDF8'] },
  { id: 'solid-rose',     name: 'Rose',         category: 'solid', primary_color: '#E11D48', accent_color: '#A855F7', preview_colors: ['#E11D48', '#A855F7'] },
  { id: 'solid-amber',    name: 'Amber',        category: 'solid', primary_color: '#D97706', accent_color: '#10B981', preview_colors: ['#D97706', '#10B981'] },
]

// ---------------------------------------------------------------------------
// COSMIC PRESETS -- all dark base + star-field CSS + distinct nebula overlay
// sidebar_gradient_css stores the nebula radial-gradient overlay (--nebula-gradient)
// ---------------------------------------------------------------------------
export const COSMIC_PRESETS: ThemePreset[] = [
  {
    id: 'cosmic-galaxy',
    name: 'Galaxy',
    category: 'cosmic',
    primary_color: '#7C3AED',
    accent_color: '#38BDF8',
    // Base near-black with purple-blue undertone
    gradient_css: 'linear-gradient(135deg, #0a0014 0%, #0f0a2e 30%, #0d1b4b 60%, #0a0028 100%)',
    // Nebula: purple + blue radial glow
    sidebar_gradient_css: 'radial-gradient(ellipse 60% 45% at 25% 35%, rgba(124,58,237,0.22) 0%, transparent 65%), radial-gradient(ellipse 50% 40% at 75% 65%, rgba(56,189,248,0.14) 0%, transparent 65%), radial-gradient(ellipse 70% 35% at 50% 80%, rgba(139,92,246,0.10) 0%, transparent 65%)',
    theme_mode: 'dark',
    preview_colors: ['#0a0014', '#7C3AED', '#38BDF8'],
    description: 'Purple-blue nebula over deep void',
  },
  {
    id: 'cosmic-deep-space',
    name: 'Deep Space',
    category: 'cosmic',
    primary_color: '#6366F1',
    accent_color: '#A5B4FC',
    // Near-true-black with barely-perceptible indigo tint
    gradient_css: 'linear-gradient(135deg, #020305 0%, #04060f 40%, #030510 70%, #020307 100%)',
    // Nebula: very subtle indigo glow only
    sidebar_gradient_css: 'radial-gradient(ellipse 55% 40% at 30% 30%, rgba(99,102,241,0.16) 0%, transparent 60%), radial-gradient(ellipse 40% 30% at 70% 70%, rgba(165,180,252,0.08) 0%, transparent 60%)',
    theme_mode: 'dark',
    preview_colors: ['#020305', '#6366F1', '#A5B4FC'],
    description: 'Near-true-black with subtle indigo, premium and minimal',
  },
  {
    id: 'cosmic-nebula-pink',
    name: 'Nebula Pink',
    category: 'cosmic',
    primary_color: '#C026D3',
    accent_color: '#F0ABFC',
    // Dark with magenta-violet undertone
    gradient_css: 'linear-gradient(135deg, #0d0310 0%, #180822 35%, #1a0528 70%, #0f0518 100%)',
    // Nebula: magenta + pink radial glow
    sidebar_gradient_css: 'radial-gradient(ellipse 65% 45% at 30% 40%, rgba(192,38,211,0.25) 0%, transparent 65%), radial-gradient(ellipse 45% 35% at 70% 60%, rgba(236,72,153,0.15) 0%, transparent 65%), radial-gradient(ellipse 35% 25% at 50% 85%, rgba(240,171,252,0.08) 0%, transparent 60%)',
    theme_mode: 'dark',
    preview_colors: ['#0d0310', '#C026D3', '#F0ABFC'],
    description: 'Magenta-violet cosmic dust over deep void',
  },
  {
    id: 'cosmic-aurora',
    name: 'Aurora Night',
    category: 'cosmic',
    primary_color: '#0D9488',
    accent_color: '#34D399',
    // Near-black with very subtle teal undertone
    gradient_css: 'linear-gradient(135deg, #020d0d 0%, #030f12 35%, #041214 70%, #020d0c 100%)',
    // Nebula: emerald + cyan aurora glow
    sidebar_gradient_css: 'radial-gradient(ellipse 70% 40% at 40% 40%, rgba(16,185,129,0.20) 0%, transparent 65%), radial-gradient(ellipse 50% 30% at 65% 65%, rgba(6,182,212,0.14) 0%, transparent 65%), radial-gradient(ellipse 60% 25% at 20% 70%, rgba(52,211,153,0.10) 0%, transparent 60%)',
    theme_mode: 'dark',
    preview_colors: ['#020d0d', '#0D9488', '#34D399'],
    description: 'Teal-green northern lights over void-black',
  },
  {
    id: 'cosmic-solar-flare',
    name: 'Solar Flare',
    category: 'cosmic',
    primary_color: '#EA580C',
    accent_color: '#FCD34D',
    // Near-black with subtle amber undertone
    gradient_css: 'linear-gradient(135deg, #0f0400 0%, #160600 35%, #140500 70%, #0a0300 100%)',
    // Nebula: amber + gold radial burst
    sidebar_gradient_css: 'radial-gradient(ellipse 60% 50% at 35% 35%, rgba(234,88,12,0.24) 0%, transparent 65%), radial-gradient(ellipse 40% 30% at 65% 65%, rgba(245,158,11,0.14) 0%, transparent 65%), radial-gradient(ellipse 30% 25% at 50% 80%, rgba(252,211,77,0.08) 0%, transparent 55%)',
    theme_mode: 'dark',
    preview_colors: ['#0f0400', '#EA580C', '#FCD34D'],
    description: 'Amber-orange star burst over deep void',
  },
]

// Keep legacy galaxy id pointing to cosmic-galaxy for backwards compat
export const GALAXY_PRESET = COSMIC_PRESETS[0]

// ---------------------------------------------------------------------------
// CUSTOM
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
  ...COSMIC_PRESETS,
  CUSTOM_PRESET,
]

export function findPreset(id: string): ThemePreset | undefined {
  return ALL_PRESETS.find((p) => p.id === id)
}
