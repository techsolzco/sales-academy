'use server'

import type { ActionResult } from '@/types'

const GEMINI_MODELS = ['gemini-3.7-flash', 'gemini-3.6-flash', 'gemini-3.5-flash', 'gemini-flash-latest']

export async function universalTranslate(text: string, targetLanguage: string): Promise<ActionResult<string>> {
  try {
    const key = process.env.GEMINI_API_KEY!
    const systemPrompt = `You are a professional translator. Translate the provided text to ${targetLanguage}. Provide ONLY the translated text, no explanations or quotes.`
    
    for (const model of GEMINI_MODELS) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents: [{ parts: [{ text }], role: 'user' }],
          generationConfig: { temperature: 0.3, maxOutputTokens: 1024 },
        }),
      })
      if (!res.ok) continue
      const data = await res.json()
      const result = data.candidates?.[0]?.content?.parts?.[0]?.text
      if (result) return { data: result.trim() }
    }
    return { error: 'Translation service unavailable. Please try again.' }
  } catch (e: any) {
    return { error: e.message }
  }
}
