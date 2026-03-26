'use client'

import { useState, useRef } from 'react'

interface UploadedPhoto {
  id: string
  generated_filename: string
  ai_description: string | null
  thumbnail_url: string | null
  storage_path: string
  hod_description: string
  category: string
}

interface PhotoUploaderProps {
  departmentSlug: string
  departmentId: string
  reportDate: string
  categories: string[]
  maxPhotos: number
  value: UploadedPhoto[]
  onChange: (photos: UploadedPhoto[]) => void
  readOnly?: boolean
}

type UploadState = 'idle' | 'describe' | 'uploading'

export default function PhotoUploader({
  departmentSlug,
  departmentId,
  reportDate,
  categories,
  maxPhotos,
  value,
  onChange,
  readOnly = false,
}: PhotoUploaderProps) {
  const [state, setState] = useState<UploadState>('idle')
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [pendingPreview, setPendingPreview] = useState<string | null>(null)
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState(categories[0] ?? 'Record keeping')
  const [error, setError] = useState('')
  const [uploadProgress, setUploadProgress] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('Only JPEG, PNG, and WebP images are allowed.')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('Image must be under 10MB.')
      return
    }

    setError('')
    setPendingFile(file)
    setPendingPreview(URL.createObjectURL(file))
    setDescription('')
    setCategory(categories[0] ?? 'Record keeping')
    setState('describe')
  }

  function cancelPending() {
    if (pendingPreview) URL.revokeObjectURL(pendingPreview)
    setPendingFile(null)
    setPendingPreview(null)
    setDescription('')
    setError('')
    setState('idle')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function handleUpload() {
    if (!pendingFile || !description.trim()) return

    setState('uploading')
    setUploadProgress(true)
    setError('')

    try {
      const formData = new FormData()
      formData.append('file', pendingFile)
      formData.append('description', description.trim())
      formData.append('category', category)
      formData.append('department_slug', departmentSlug)
      formData.append('department_id', departmentId)
      formData.append('report_date', reportDate)
      formData.append('categories', categories.join(','))

      const res = await fetch('/api/upload-media', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Upload failed.')
        setState('describe')
        setUploadProgress(false)
        return
      }

      const newPhoto: UploadedPhoto = {
        id: data.id,
        generated_filename: data.generated_filename,
        ai_description: data.ai_description,
        thumbnail_url: data.thumbnail_url,
        storage_path: data.storage_path,
        hod_description: description.trim(),
        category,
      }

      onChange([...value, newPhoto])
      cancelPending()
    } catch {
      setError('Upload failed. Check your connection and try again.')
      setState('describe')
    } finally {
      setUploadProgress(false)
    }
  }

  function removePhoto(id: string) {
    onChange(value.filter((p) => p.id !== id))
  }

  const canAddMore = value.length < maxPhotos

  if (readOnly) {
    if (value.length === 0) return null

    return (
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          {value.map((photo) => (
            <div key={photo.id} className="border border-gray-200 rounded-lg overflow-hidden bg-white">
              {photo.thumbnail_url && (
                <img
                  src={photo.thumbnail_url}
                  alt={photo.ai_description || photo.hod_description}
                  className="w-full h-32 object-cover"
                />
              )}
              <div className="p-2 space-y-1">
                {photo.ai_description && (
                  <p className="text-xs text-gray-700">{photo.ai_description}</p>
                )}
                <p className="text-xs text-gray-400 italic">&ldquo;{photo.hod_description}&rdquo;</p>
                <span className="inline-block text-xs bg-gray-100 text-gray-500 rounded px-1.5 py-0.5">
                  {photo.category}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Uploaded photos grid */}
      {value.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          {value.map((photo) => (
            <div key={photo.id} className="relative border border-gray-200 rounded-lg overflow-hidden bg-white">
              {photo.thumbnail_url && (
                <img
                  src={photo.thumbnail_url}
                  alt={photo.ai_description || photo.hod_description}
                  className="w-full h-28 object-cover"
                />
              )}
              <div className="p-2 space-y-1">
                {photo.ai_description && (
                  <p className="text-xs text-gray-700 line-clamp-2">{photo.ai_description}</p>
                )}
                <span className="inline-block text-xs bg-gray-100 text-gray-500 rounded px-1.5 py-0.5">
                  {photo.category}
                </span>
              </div>
              <button
                type="button"
                onClick={() => removePhoto(photo.id)}
                className="absolute top-1 right-1 w-6 h-6 bg-black/50 hover:bg-black/70 text-white rounded-full flex items-center justify-center text-xs"
              >
                &times;
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Describe pending photo */}
      {state === 'describe' && pendingPreview && (
        <div className="border border-ziwa-200 rounded-xl p-4 bg-ziwa-50 space-y-3">
          <div className="flex gap-3">
            <img
              src={pendingPreview}
              alt="Preview"
              className="w-20 h-20 object-cover rounded-lg flex-shrink-0"
            />
            <div className="flex-1 space-y-2">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Describe this image <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What does this show? Give context..."
                  rows={2}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ziwa-500 focus:border-transparent"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Why?</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ziwa-500 focus:border-transparent bg-white"
                >
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">{error}</p>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleUpload}
              disabled={!description.trim() || uploadProgress}
              className="flex-1 bg-ziwa-500 hover:bg-ziwa-600 disabled:bg-ziwa-300 text-white font-semibold py-2 rounded-lg transition-colors text-sm"
            >
              {uploadProgress ? 'Uploading...' : 'Upload'}
            </button>
            <button
              type="button"
              onClick={cancelPending}
              className="px-4 py-2 border border-gray-300 text-gray-600 rounded-lg text-sm hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Uploading state */}
      {state === 'uploading' && (
        <div className="border border-ziwa-200 rounded-xl p-6 bg-ziwa-50 text-center space-y-2">
          <div className="w-8 h-8 border-2 border-ziwa-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-gray-600">Uploading and analysing image...</p>
        </div>
      )}

      {/* Add photo button */}
      {state === 'idle' && canAddMore && (
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
            className="inline-flex items-center gap-1.5 text-sm text-ziwa-600 font-medium hover:text-ziwa-700 border border-ziwa-300 rounded-md px-3 py-1.5 hover:bg-ziwa-50 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            {value.length === 0 ? 'Add photo' : 'Add another photo'}
          </button>
          {error && (
            <p className="mt-2 text-sm text-red-600">{error}</p>
          )}
        </div>
      )}

      {value.length > 0 && (
        <p className="text-xs text-gray-400">{value.length}/{maxPhotos} photos</p>
      )}
    </div>
  )
}

export type { UploadedPhoto }
