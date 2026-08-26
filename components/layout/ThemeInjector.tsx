'use client'

import { useLayoutEffect } from 'react'
import { ThemeSettings } from '@/types'
import { hexToHSL } from '@/lib/utils/themeUtils'

function buildCSS(theme: ThemeSettings | null) {
  const primaryHex = theme?.primary_color || '#4F46E5'
  const accentHex = theme?.accent_color || '#10B981'
  const primary = hexToHSL(primaryHex)
  const accent = hexToHSL(accentHex)
  const ph = primary.h, ps = primary.s, pl = primary.l
  const ah = accent.h, as_ = accent.s, al = accent.l
  const gradientCss = theme?.gradient_css || ''
  const nebulaCss = theme?.sidebar_gradient_css || ''
  const wallpaperUrl = theme?.wallpaper_url || ''
  const wallpaperOpacity = theme?.wallpaper_opacity ?? 0.15
  const cardOpacity = theme?.card_opacity ?? 1.0
  const isCosmic = theme?.theme_preset?.startsWith('cosmic-') || theme?.theme_preset === 'galaxy'
  const sidebarFallback = 'linear-gradient(to bottom, hsl(' + ph + ' ' + ps + '% 22%), hsl(' + ph + ' ' + ps + '% 14%))'

  return `
    :root {
      --primary: ${ph} ${ps}% ${pl}%;
      --ring: ${ph} ${ps}% ${pl}%;
      --accent: ${ah} ${as_}% ${al}%;
      --accent-foreground: ${ah} ${as_}% 10%;
      --brand-50:  ${ph} ${ps}% 97%;
      --brand-100: ${ph} ${ps}% 92%;
      --brand-200: ${ph} ${ps}% 84%;
      --brand-300: ${ph} ${ps}% 74%;
      --brand-400: ${ph} ${ps}% 62%;
      --brand-500: ${ph} ${ps}% 50%;
      --brand-600: ${ph} ${ps}% 40%;
      --brand-700: ${ph} ${ps}% 32%;
      --brand-800: ${ph} ${ps}% 22%;
      --brand-900: ${ph} ${ps}% 14%;
      --page-gradient: ${gradientCss};
      --sidebar-gradient: ${isCosmic ? gradientCss : (nebulaCss || sidebarFallback)};
      --nebula-gradient: ${nebulaCss};
      --wallpaper-url: ${wallpaperUrl ? ("url('" + wallpaperUrl + "')") : 'none'};
      --wallpaper-opacity: ${wallpaperOpacity};
      --card-opacity: ${cardOpacity};
    }
    ${gradientCss ? `
      body { background: ${gradientCss}; background-attachment: fixed; min-height: 100vh; }
    ` : ''}
    ${wallpaperUrl ? `
      body.has-wallpaper::before {
        content: '';
        position: fixed;
        inset: 0;
        background-image: url('${wallpaperUrl}');
        background-size: cover;
        background-position: center;
        opacity: ${wallpaperOpacity};
        z-index: 0;
        pointer-events: none;
      }
      body.has-wallpaper { position: relative; }
    ` : ''}
  `
}

export function ThemeInjector({ theme }: { theme: ThemeSettings | null }) {
  const primaryHex = theme?.primary_color || '#4F46E5'
  const accentHex = theme?.accent_color || '#10B981'
  const isCosmic = theme?.theme_preset?.startsWith('cosmic-') || theme?.theme_preset === 'galaxy'
  const nebulaCss = theme?.sidebar_gradient_css || ''

  useLayoutEffect(() => {
    const primary = hexToHSL(primaryHex)
    const accent = hexToHSL(accentHex)
    const root = document.documentElement
    const ph = primary.h, ps = primary.s, pl = primary.l
    const ah = accent.h, as_ = accent.s, al = accent.l
    root.style.setProperty('--primary', ph + ' ' + ps + '% ' + pl + '%')
    root.style.setProperty('--ring', ph + ' ' + ps + '% ' + pl + '%')
    root.style.setProperty('--accent', ah + ' ' + as_ + '% ' + al + '%')
    const shades: [string, number][] = [
      ['--brand-50', 97], ['--brand-100', 92], ['--brand-200', 84],
      ['--brand-300', 74], ['--brand-400', 62], ['--brand-500', 50],
      ['--brand-600', 40], ['--brand-700', 32], ['--brand-800', 22], ['--brand-900', 14],
    ]
    shades.forEach(([v, l]) => root.style.setProperty(v, ph + ' ' + ps + '% ' + l + '%'))

    const sidebarFallback = 'linear-gradient(to bottom, hsl(' + ph + ' ' + ps + '% 22%), hsl(' + ph + ' ' + ps + '% 14%))'
    root.style.setProperty('--sidebar-gradient', isCosmic ? (theme?.gradient_css || '') : (nebulaCss || sidebarFallback))
    root.style.setProperty('--nebula-gradient', nebulaCss)
    root.style.setProperty('--card-opacity', String(theme?.card_opacity ?? 1.0))
    root.style.setProperty('--wallpaper-opacity', String(theme?.wallpaper_opacity ?? 0.15))

    if (theme?.wallpaper_url) {
      document.body.classList.add('has-wallpaper')
    } else {
      document.body.classList.remove('has-wallpaper')
    }

    if (isCosmic) {
      root.classList.add('galaxy-theme')
    } else {
      root.classList.remove('galaxy-theme')
    }
  }, [primaryHex, accentHex, theme?.gradient_css, theme?.sidebar_gradient_css, theme?.wallpaper_url, isCosmic, theme?.card_opacity, theme?.wallpaper_opacity])

  const css = buildCSS(theme)
  return <style id="theme-injector" dangerouslySetInnerHTML={{ __html: css }} />
}
