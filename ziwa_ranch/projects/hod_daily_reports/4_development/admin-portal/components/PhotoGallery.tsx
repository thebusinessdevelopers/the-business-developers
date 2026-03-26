'use client'

import { useState } from 'react'

interface MediaItem {
  id: string
  storage_path: string
  generated_filename: string
  hod_description: string
  ai_description: string | null
  ai_tags: string[] | null
  context_category: string
  created_at: string
}

interface PhotoGalleryProps {
  media: MediaItem[]
  supabaseUrl: string
}

export default function PhotoGallery({ media, supabaseUrl }: PhotoGalleryProps) {
  const [expanded, setExpanded] = useState<string | null>(null)

  if (media.length === 0) return null

  function getPublicUrl(path: string) {
    return `${supabaseUrl}/storage/v1/object/authenticated/hod-report-media/${path}`
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-gray-700">Photos ({media.length})</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {media.map((item) => (
          <div
            key={item.id}
            className="border border-gray-200 rounded-lg overflow-hidden bg-white cursor-pointer hover:border-gray-300 transition-colors"
            onClick={() => setExpanded(expanded === item.id ? null : item.id)}
          >
            <div className="relative">
              <img
                src={getPublicUrl(item.storage_path)}
                alt={item.ai_description || item.hod_description}
                className="w-full h-32 object-cover"
                loading="lazy"
              />
              <span className="absolute bottom-1 right-1 text-xs bg-black/60 text-white rounded px-1.5 py-0.5">
                {item.context_category}
              </span>
            </div>

            <div className="p-2 space-y-1">
              {item.ai_description && (
                <p className="text-xs text-gray-700 line-clamp-2">{item.ai_description}</p>
              )}
              <p className="text-xs text-gray-400 italic line-clamp-1">
                &ldquo;{item.hod_description}&rdquo;
              </p>
              {item.ai_tags && item.ai_tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {item.ai_tags.map((tag) => (
                    <span key={tag} className="text-xs bg-gray-100 text-gray-500 rounded px-1 py-0.5">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {expanded === item.id && (
              <div className="border-t border-gray-100 p-2 space-y-1 bg-gray-50">
                <p className="text-xs text-gray-500">
                  <span className="font-medium">File:</span> {item.generated_filename}
                </p>
                <p className="text-xs text-gray-500">
                  <span className="font-medium">Uploaded:</span>{' '}
                  {new Date(item.created_at).toLocaleString('en-GB', { timeZone: 'Africa/Kampala' })}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export type { MediaItem }
