/**
 * Shared theme utility functions for both server-side ThemeInjector and
 * client-side AppearanceForm live preview.
 */

export function hexToHSL(hex: string): { h: number; s: number; l: number } {
  let r = 0, g = 0, b = 0
  const clean = hex.replace('#', '')
  if (clean.length === 3) {
    r = parseInt(clean[0] + clean[0], 16)
    g = parseInt(clean[1] + clean[1], 16)
    b = parseInt(clean[2] + clean[2], 16)
  } else if (clean.length === 6) {
    r = parseInt(clean.substring(0, 2), 16)
    g = parseInt(clean.substring(2, 4), 16)
    b = parseInt(clean.substring(4, 6), 16)
  }
  r /= 255; g /= 255; b /= 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  let h = 0, s = 0
  const l = (max + min) / 2
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break
      case g: h = (b - r) / d + 2; break
      case b: h = (r - g) / d + 4; break
    }
    h /= 6
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) }
}

/**
 * Apply theme CSS variables directly to the document root for live preview.
 * Safe to call from client components only.
 */
export function applyThemeToDocument(primary: string, accent: string) {
  if (typeof window === 'undefined') return
  const { h: ph, s: ps } = hexToHSL(primary)
  const { h: ah, s: as_, l: al } = hexToHSL(accent)
  const root = document.documentElement
  root.style.setProperty('--primary', `${ph} ${ps}% ${hexToHSL(primary).l}%`)
  root.style.setProperty('--ring', `${ph} ${ps}% ${hexToHSL(primary).l}%`)
  root.style.setProperty('--accent', `${ah} ${as_}% ${al}%`)
  const shades: [string, number][] = [
    ['--brand-50', 97], ['--brand-100', 92], ['--brand-200', 84],
    ['--brand-300', 74], ['--brand-400', 62], ['--brand-500', 50],
    ['--brand-600', 40], ['--brand-700', 32], ['--brand-800', 22], ['--brand-900', 14],
  ]
  shades.forEach(([v, l]) => root.style.setProperty(v, `${ph} ${ps}% ${l}%`))
}
