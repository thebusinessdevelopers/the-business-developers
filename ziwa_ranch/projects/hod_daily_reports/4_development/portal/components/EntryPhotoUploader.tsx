'use client'

import { useState, useRef } from 'react'

interface EntryPhoto {
  id: string
  thumbnail_url: string | null
  storage_path: string
  hod_description: string
}

interface EntryPhotoUploaderProps {
  departmentSlug: string
  departmentId: string
  reportDate: string
  entryKey: string
  value: EntryPhoto[]
  onChange: (photos: EntryPhoto[]) => void
}

export default function EntryPhotoUploader({
  departmentSlug,
  departmentId,
  reportDate,
  entryKey,
  value,
  onChange,
}: EntryPhotoUploaderProps) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const photos = Array.isArray(value) ? value : []

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('Only JPEG, PNG, or WebP.')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('Max 10MB.')
      return
    }

    setError('')
    setUploading(true)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('description', 'Payment receipt')
      formData.append('category', 'Receipt')
      formData.append('department_slug', departmentSlug)
      formData.append('department_id', departmentId)
      formData.append('report_date', reportDate)
      formData.append('entry_key', entryKey)

      const res = await fetch('/api/upload-media', { method: 'POST', body: formData })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Upload failed.')
        return
      }

      const photo: EntryPhoto = {
        id: data.id,
        thumbnail_url: data.thumbnail_url,
        storage_path: data.storage_path,
        hod_description: 'Payment receipt',
      }
      onChange([...photos, photo])
    } catch {
      setError('Upload failed. Check connection.')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  function removePhoto(id: string) {
    onChange(photos.filter((p) => p.id !== id))
  }

  return (
    <div className="mt-1">
      {photos.length > 0 && (
        <div className="flex gap-2 mb-2 flex-wrap">
          {photos.map((photo) => (
            <div key={photo.id} className="relative w-16 h-16 rounded-md overflow-hidden border border-gray-200">
              {photo.thumbnail_url ? (
                <img src={photo.thumbnail_url} alt="Receipt" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                  <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              )}
              <button
                type="button"
                onClick={() => removePhoto(photo.id)}
                className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs leading-none"
              >
                &times;
              </button>
            </div>
          ))}
        </div>
      )}

      {uploading ? (
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <div className="w-4 h-4 border-2 border-ziwa-500 border-t-transparent rounded-full animate-spin" />
          Uploading...
        </div>
      ) : (
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            capture="environment"
            onChange={handleFileSelect}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-1 text-xs text-ziwa-600 hover:text-ziwa-700 font-medium"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            {photos.length === 0 ? 'Attach receipt' : 'Add another'}
          </button>
        </div>
      )}

      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  )
}

export type { EntryPhoto }
