'use client'

import { useState, useRef } from 'react'
import { Upload, Loader2, ImageIcon, X } from 'lucide-react'

interface ImageUploadProps {
  currentUrl?: string
  bucket: string
  folder?: string
  onUpload: (url: string) => void
  label?: string
}

export function ImageUpload({ currentUrl, bucket, folder, onUpload, label }: ImageUploadProps) {
  const [preview, setPreview] = useState<string | null>(currentUrl || null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { setError('Please select an image file'); return }
    if (file.size > 5 * 1024 * 1024) { setError('Image must be under 5MB'); return }
    
    setError(null)
    setPreview(URL.createObjectURL(file))
    setUploading(true)
    
    const formData = new FormData()
    formData.append('file', file)
    formData.append('bucket', bucket)
    if (folder) formData.append('folder', folder)

    try {
      const res = await fetch('/api/upload-image', { method: 'POST', body: formData })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      onUpload(data.url)
    } catch (err: any) {
      setError(err.message || 'Upload failed')
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
          accept="image/*"
          className="hidden"
          onChange={handleFile}
        />
      </div>
    </div>
  )
}
