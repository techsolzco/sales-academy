'use client'

import { ThemeSettings } from '@/types'

function hexToHSL(hex: string) {
  let r = 0, g = 0, b = 0;
  if (hex.length === 4) {
    r = parseInt(hex[1] + hex[1], 16);
    g = parseInt(hex[2] + hex[2], 16);
    b = parseInt(hex[3] + hex[3], 16);
  } else if (hex.length === 7) {
    r = parseInt(hex.substring(1, 3), 16);
    g = parseInt(hex.substring(3, 5), 16);
    b = parseInt(hex.substring(5, 7), 16);
  }
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

export function ThemeInjector({ theme }: { theme: ThemeSettings | null }) {
  if (!theme) return null;

  const primary = hexToHSL(theme.primary_color);
  const accent = hexToHSL(theme.accent_color);

  const style = `
    :root {
      --primary: ${primary.h} ${primary.s}% ${primary.l}%;
      --accent: ${accent.h} ${accent.s}% ${accent.l}%;
      
      --brand-50: ${primary.h} ${primary.s}% 95%;
      --brand-100: ${primary.h} ${primary.s}% 90%;
      --brand-200: ${primary.h} ${primary.s}% 80%;
      --brand-300: ${primary.h} ${primary.s}% 70%;
      --brand-400: ${primary.h} ${primary.s}% 60%;
      --brand-500: ${primary.h} ${primary.s}% 50%;
      --brand-600: ${primary.h} ${primary.s}% 40%;
      --brand-700: ${primary.h} ${primary.s}% 30%;
      --brand-800: ${primary.h} ${primary.s}% 20%;
      --brand-900: ${primary.h} ${primary.s}% 10%;
    }
  `;

  return <style dangerouslySetInnerHTML={{ __html: style }} />;
}
