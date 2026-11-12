'use client'

import { useState, useRef } from 'react'
import { Upload, Loader2, ImageIcon, X } from 'lucide-react'

interface ImageUploadProps {
  currentUrl?: string
  bucket: string
  // Accepted for caller compatibility only — the server ignores `folder`
  // and uses a fixed path prefix per upload kind.
  folder?: string
  onUpload: (url: string) => void
  label?: string
}

// Client-side mirror of the server allowlist in app/api/upload-image/route.ts.
// The server re-validates `kind` and resolves the bucket + path prefix
// itself; `bucket`/`folder` are never sent, so a caller cannot pick a
// different bucket or folder. Unknown buckets fail here before any upload.
const KIND_BY_BUCKET: Record<string, string> = {
  'course-thumbnails': 'course-thumbnail',
  'tool-logos': 'tool-logo',
  announcements: 'announcement',
  avatars: 'avatar',
  'assignment-files': 'assignment-file',
}

const ALLOWED_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp']

export function ImageUpload({ currentUrl, bucket, onUpload, label }: ImageUploadProps) {
  const [preview, setPreview] = useState<string | null>(currentUrl || null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!ALLOWED_MIME_TYPES.includes(file.type)) { setError('Only PNG, JPEG and WebP images are allowed'); if (inputRef.current) inputRef.current.value = ''; return }
    if (file.size > 5 * 1024 * 1024) { setError('Image must be under 5MB'); if (inputRef.current) inputRef.current.value = ''; return }

    const kind = KIND_BY_BUCKET[bucket]
    if (!kind) { setError('Unsupported upload target'); if (inputRef.current) inputRef.current.value = ''; return }

    setError(null)
    // B51: no preview of the new file until the upload actually succeeds.
    // The previously saved image (currentUrl) stays visible meanwhile.
    setUploading(true)

    const formData = new FormData()
    formData.append('file', file)
    formData.append('kind', kind)

    try {
      const res = await fetch('/api/upload-image', { method: 'POST', body: formData })
      const data = await res.json()
      if (!res.ok || data.error) throw new Error(data.error || `Upload failed (${res.status})`)
      // Only now — with a URL that really uploaded — show it and report it.
      setPreview(data.url)
      onUpload(data.url)
    } catch (err: any) {
      // B51: on failure clear the (never-set) new preview, revert to the
      // last saved image, and show the error — never leave a preview of a
      // file that did not upload, and never call onUpload with it.
      setPreview(currentUrl || null)
      setError(err.message || 'Upload failed')
      if (inputRef.current) inputRef.current.value = ''
    } finally {
      setUploading(false)
    }
  }

  function clear() {
    setPreview(null)
    onUpload('')
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div>
      {label && <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{label}</label>}
      <div className="space-y-3">
        {preview ? (
          <div className="relative w-full max-w-xs">
            <img src={preview} alt="Preview" className="w-full h-40 object-cover rounded-xl border border-gray-200 dark:border-gray-600" />
            <button type="button" onClick={clear} className="absolute top-2 right-2 bg-white dark:bg-gray-800 rounded-full p-1 shadow hover:bg-red-50 transition">
              <X className="w-4 h-4 text-gray-500" />
            </button>
          </div>
        ) : (
          <div
            onClick={() => inputRef.current?.click()}
            className="w-full max-w-xs h-40 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-600 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-brand-400 hover:bg-brand-50 dark:hover:bg-brand-900/20 transition-colors"
          >
            <ImageIcon className="w-8 h-8 text-gray-300" />
            <p className="text-sm text-gray-400">Click to upload image</p>
            <p className="text-xs text-gray-300">PNG, JPG, WebP up to 5MB</p>
          </div>
        )}

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 text-sm text-gray-600 dark:text-gray-300 hover:border-brand-400 hover:text-brand-600 disabled:opacity-50 transition"
        >
          {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          {uploading ? 'Uploading...' : 'Choose file'}
        </button>

        {error && <p className="text-xs text-red-500">{error}</p>}

        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={handleFile}
        />
      </div>
    </div>
  )
}
