'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5 MB

// MIME type -> extension derived from the validated MIME type, never from
// the client-supplied filename. Anything else (incl. .svg / .html) is rejected.
const ALLOWED_MIME_TYPES = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
} as const

// Fixed allowlist of buckets with a fixed path prefix per bucket. The
// `folder` argument is accepted for signature compatibility but deliberately
// IGNORED — callers can no longer choose where a file lands.
const ALLOWED_BUCKETS = {
  'course-thumbnails': 'thumbnails',
  'tool-logos': 'logos',
  announcements: 'attachments',
  avatars: '',
  'assignment-files': 'admin',
} as const

async function requireAdmin() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (profile?.role !== 'admin') throw new Error('Forbidden')
  return { supabase }
}

export async function uploadImage(
  bucket: string,
  file: File,
  folder?: string
): Promise<{ url: string } | { error: string }> {
  // NOTE: `folder` is intentionally ignored — the path prefix is fixed per
  // bucket in ALLOWED_BUCKETS (see above). Kept in the signature only so
  // existing call sites keep compiling.
  void folder
  try {
    await requireAdmin()

    if (!(bucket in ALLOWED_BUCKETS)) {
      return { error: 'Bucket not allowed' }
    }

    const ext =
      ALLOWED_MIME_TYPES[file.type as keyof typeof ALLOWED_MIME_TYPES]
    if (!ext) {
      return { error: 'Only PNG, JPEG and WebP images are allowed' }
    }
    if (file.size > MAX_FILE_SIZE) {
      return { error: 'Image must be under 5MB' }
    }

    const prefix = ALLOWED_BUCKETS[bucket as keyof typeof ALLOWED_BUCKETS]
    const path = `${prefix ? prefix + '/' : ''}${crypto.randomUUID()}.${ext}`
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const supabase = createAdminClient()
    const { error } = await supabase.storage.from(bucket).upload(path, buffer, {
      contentType: file.type,
      upsert: false,
    })
    if (error) throw error
    const {
      data: { publicUrl },
    } = supabase.storage.from(bucket).getPublicUrl(path)
    return { url: publicUrl }
  } catch (e: any) {
    return { error: e.message || 'Upload failed' }
  }
}
