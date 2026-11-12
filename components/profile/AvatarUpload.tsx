'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { updateAvatar } from '@/lib/actions/profile'
import { Camera, Loader2 } from 'lucide-react'

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5 MB

// MIME type -> extension derived from the validated MIME type, never from
// the client filename. Anything else (incl. .svg / .html) is rejected, so a
// file with no extension can never produce a `.undefined` path.
const ALLOWED_MIME_TYPES = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
} as const

interface Props {
  userId: string
  currentAvatarUrl?: string | null
  initials: string
}

export function AvatarUpload({ userId, currentAvatarUrl, initials }: Props) {
  const [uploading, setUploading] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState(currentAvatarUrl)
  const [error, setError] = useState<string | null>(null)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return
    const file = e.target.files[0]

    // B52 (a): same validation as ImageUpload — image-only, 5 MB.
    const ext = ALLOWED_MIME_TYPES[file.type as keyof typeof ALLOWED_MIME_TYPES]
    if (!ext) {
      setError('Only PNG, JPEG and WebP images are allowed')
      e.target.value = ''
      return
    }
    if (file.size > MAX_FILE_SIZE) {
      setError('Image must be under 5MB')
      e.target.value = ''
      return
    }

    setError(null)
    setUploading(true)

    try {
      const supabase = createClient()
      // B52 (c): one fixed path per user, so re-uploads overwrite via
      // upsert instead of orphaning a new timestamped file each time.
      const filePath = `${userId}/avatar.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true, contentType: file.type })

      if (uploadError) throw uploadError

      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath)

      // B52 (b): only set the avatar URL if the profile update succeeded.
      const result = await updateAvatar(data.publicUrl)
      if (result.error) throw new Error(result.error)
      setAvatarUrl(data.publicUrl)
    } catch (err: any) {
      setError(err.message || 'Error uploading avatar')
      e.target.value = ''
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="relative inline-block group">
      <div className="w-24 h-24 rounded-full overflow-hidden bg-brand-100 flex items-center justify-center border-4 border-white shadow-lg">
        {avatarUrl ? (
          <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
        ) : (
          <span className="text-3xl font-bold text-brand-600 uppercase">{initials}</span>
        )}
      </div>

      <label className="absolute inset-0 flex items-center justify-center bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
        {uploading ? (
          <Loader2 className="w-6 h-6 animate-spin" />
        ) : (
          <Camera className="w-6 h-6" />
        )}
        <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleFileChange} disabled={uploading} />
      </label>
      {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
    </div>
  )
}
