'use client'

import Link from 'next/link'
import { Languages } from 'lucide-react'

export function TranslatorFab() {
  return (
    <Link
      href="/dashboard/translate"
      className="fixed bottom-20 left-4 z-40 w-11 h-11 bg-brand-600 hover:bg-brand-700 text-white rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-110 active:scale-95"
      title="Universal Translator"
    >
      <Languages className="w-5 h-5" />
    </Link>
  )
}
