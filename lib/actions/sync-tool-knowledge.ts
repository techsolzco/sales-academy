'use server'
import { refreshToolKnowledge } from './tool-onboard'

/**
 * Non-blocking wrapper — fires knowledge refresh in background.
 * Call this after any KB content create/update/delete.
 */
export async function syncToolKnowledge(toolId: string | null | undefined) {
  if (!toolId) return // Skip if no tool_id (e.g. standalone content)
  try {
    await refreshToolKnowledge(toolId)
  } catch (e) {
    console.warn('[SyncKnowledge] Non-fatal refresh error:', e)
  }
}
