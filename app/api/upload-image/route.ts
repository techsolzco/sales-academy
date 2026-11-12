import { NextRequest, NextResponse } from 'next/server'
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

// Fixed allowlist: the client only ever sends a `kind`; the bucket and the
// path prefix are resolved server-side. `bucket` / `folder` are NEVER read
// from the request, so a caller cannot redirect an upload to another bucket
// or folder. `announcements` has no bucket-creation migration (see report);
// it is included because AnnouncementManager (admin-only) uses it, and the
// upload still fails at Supabase if the bucket does not exist live.
const UPLOAD_TARGETS = {
  'course-thumbnail': { bucket: 'course-thumbnails', prefix: 'thumbnails' },
  'tool-logo': { bucket: 'tool-logos', prefix: 'logos' },
  announcement: { bucket: 'announcements', prefix: 'attachments' },
  avatar: { bucket: 'avatars', prefix: '' },
  'assignment-file': { bucket: 'assignment-files', prefix: 'admin' },
} as const

type UploadKind = keyof typeof UPLOAD_TARGETS

async function requireAdmin(): Promise<
  { user: { id: string } } | { response: NextResponse }
> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return {
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    }
  }
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (profile?.role !== 'admin') {
    return {
      response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
    }
  }
  return { user }
}

export async function POST(req: NextRequest) {
  try {
    // S3/S14: explicit auth check inside the route — never rely on the
    // middleware redirect. Unauthenticated callers get a 401, not a 302.
    const auth = await requireAdmin()
    if ('response' in auth) return auth.response

    const formData = await req.formData()
    const file = formData.get('file')
    const kind = formData.get('kind') as UploadKind | null

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'file is required' }, { status: 400 })
    }
    if (!kind || !(kind in UPLOAD_TARGETS)) {
      return NextResponse.json(
        { error: 'valid upload kind is required' },
        { status: 400 }
      )
    }

    const ext =
      ALLOWED_MIME_TYPES[file.type as keyof typeof ALLOWED_MIME_TYPES]
    if (!ext) {
      return NextResponse.json(
        { error: 'Only PNG, JPEG and WebP images are allowed' },
        { status: 400 }
      )
    }
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'Image must be under 5MB' },
        { status: 400 }
      )
    }

    const { bucket, prefix } = UPLOAD_TARGETS[kind]
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
    return NextResponse.json({ url: publicUrl })
  } catch (e: any) {
    return NextResponse.json(
      { error: e.message || 'Upload failed' },
      { status: 500 }
    )
  }
}
