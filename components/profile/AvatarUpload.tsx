'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { updateAvatar } from '@/lib/actions/profile'
import { Camera, Loader2 } from 'lucide-react'

interface Props {
  userId: string
  currentAvatarUrl?: string | null
  initials: string
}

export function AvatarUpload({ userId, currentAvatarUrl, initials }: Props) {
  const [uploading, setUploading] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState(currentAvatarUrl)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return
    const file = e.target.files[0]
    setUploading(true)

    try {
      const supabase = createClient()
      const ext = file.name.split('.').pop()
      const filePath = `${userId}/${Date.now()}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true })

      if (uploadError) throw uploadError

      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath)
      
      await updateAvatar(data.publicUrl)
      setAvatarUrl(data.publicUrl)
    } catch (err) {
      alert('Error uploading avatar')
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
        <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} disabled={uploading} />
      </label>
    </div>
  )
}
