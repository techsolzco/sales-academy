'use server'

import { createClient } from '@/lib/supabase/server'
import { callGemini } from '@/lib/actions/ai-assist'
import { ActionResult } from '@/types'

/**
 * Translates content between Urdu script and English/Hinglish.
 * If text is in Roman Urdu/English, it translates to Urdu script.
 * If text is in Urdu script, it translates to English/Hinglish.
 * 
 * @param table The database table to update
 * @param id The ID of the record to update
 * @param textsToTranslate A map of target column name -> original text to translate
 * @returns The translated texts mapped to their target columns
 */
export async function translateContent(
  table: 'faqs' | 'objections' | 'scripts' | 'voice_notes',
  id: string,
  textsToTranslate: Record<string, string>
): Promise<ActionResult<Record<string, string>>> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Unauthorized' }

    const results: Record<string, string> = {}
    
    const systemPrompt = `You are a translator for a Pakistani sales training app. Your task is to convert the provided English text into Hinglish — a natural mix of Urdu words written in Roman (Latin) script and English, exactly as spoken by Pakistani salespeople. Rules:
- Write in Roman script (Latin letters), NOT Urdu/Arabic script
- Use natural Urdu/Hinglish words where they fit (e.g., "acha", "bilkul", "phir bhi", "lekin", "matlab", "haan", "nahi", "bhai", "ap", "yeh", "woh", "jo", "ka", "ki", "ke", "hai", "hain", "tha", "thi")
- Keep product names, brand names, technical terms, and numbers in English
- Sound natural and conversational, like a salesperson talking to a customer in Pakistan
- Provide ONLY the translated text without any explanation, quotes, or markdown`

    for (const [targetColumn, originalText] of Object.entries(textsToTranslate)) {
      if (!originalText || originalText.trim() === '') continue
      const translatedText = await callGemini(systemPrompt, originalText, false)
      results[targetColumn] = translatedText.trim()
    }

    if (Object.keys(results).length > 0) {
      const { error } = await supabase
        .from(table)
        .update(results)
        .eq('id', id)
        
      if (error) {
        console.error('Translation DB update error:', error)
        return { error: 'Failed to save translation to database' }
      }
    }

    return { data: results }
  } catch (error: any) {
    console.error('Translation error:', error)
    return { error: error.message || 'Translation failed' }
  }
}
