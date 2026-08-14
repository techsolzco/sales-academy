'use client'

import { useLayoutEffect } from 'react'
import { ThemeSettings } from '@/types'
import { hexToHSL } from '@/lib/utils/themeUtils'

function buildCSS(primaryHex: string, accentHex: string) {
  const primary = hexToHSL(primaryHex)
  const accent = hexToHSL(accentHex)
  return `
    :root {
      --primary: ${primary.h} ${primary.s}% ${primary.l}%;
      --ring: ${primary.h} ${primary.s}% ${primary.l}%;
      --accent: ${accent.h} ${accent.s}% ${accent.l}%;
      --accent-foreground: ${accent.h} ${accent.s}% 10%;
      --brand-50:  ${primary.h} ${primary.s}% 97%;
      --brand-100: ${primary.h} ${primary.s}% 92%;
      --brand-200: ${primary.h} ${primary.s}% 84%;
      --brand-300: ${primary.h} ${primary.s}% 74%;
      --brand-400: ${primary.h} ${primary.s}% 62%;
      --brand-500: ${primary.h} ${primary.s}% 50%;
      --brand-600: ${primary.h} ${primary.s}% 40%;
      --brand-700: ${primary.h} ${primary.s}% 32%;
      --brand-800: ${primary.h} ${primary.s}% 22%;
      --brand-900: ${primary.h} ${primary.s}% 14%;
    }
  `
}

export function ThemeInjector({ theme }: { theme: ThemeSettings | null }) {
  const primaryHex = theme?.primary_color || '#4F46E5'
  const accentHex = theme?.accent_color || '#10B981'

  // Also apply via useLayoutEffect so theme updates client-side without a full reload
  useLayoutEffect(() => {
    const primary = hexToHSL(primaryHex)
    const accent = hexToHSL(accentHex)
    const root = document.documentElement
    root.style.setProperty('--primary', `${primary.h} ${primary.s}% ${primary.l}%`)
    root.style.setProperty('--ring', `${primary.h} ${primary.s}% ${primary.l}%`)
    root.style.setProperty('--accent', `${accent.h} ${accent.s}% ${accent.l}%`)
    const shades: [string, number][] = [
      ['--brand-50', 97], ['--brand-100', 92], ['--brand-200', 84],
      ['--brand-300', 74], ['--brand-400', 62], ['--brand-500', 50],
      ['--brand-600', 40], ['--brand-700', 32], ['--brand-800', 22], ['--brand-900', 14],
    ]
    shades.forEach(([varName, lightness]) => {
      root.style.setProperty(varName, `${primary.h} ${primary.s}% ${lightness}%`)
    })
  }, [primaryHex, accentHex])

  // SSR <style> tag so colors are applied on first paint (no flash)
  const css = buildCSS(primaryHex, accentHex)
  return <style id="theme-injector" dangerouslySetInnerHTML={{ __html: css }} />
}
