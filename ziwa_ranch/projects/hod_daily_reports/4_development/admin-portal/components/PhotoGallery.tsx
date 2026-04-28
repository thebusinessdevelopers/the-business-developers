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
  signed_url?: string
  full_signed_url?: string
  google_drive_url?: string | null
}

interface PhotoGalleryProps {
  media: MediaItem[]
}

export default function PhotoGallery({ media }: PhotoGalleryProps) {
  const [expanded, setExpanded] = useState<string | null>(null)

  if (media.length === 0) return null

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
              {item.signed_url ? (
                <img
                  src={expanded === item.id && item.full_signed_url ? item.full_signed_url : item.signed_url}
                  alt={item.ai_description || item.hod_description}
                  className={expanded === item.id ? 'w-full object-contain max-h-96' : 'w-full h-32 object-cover'}
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-32 bg-gray-100 flex items-center justify-center text-xs text-gray-400">
                  Image unavailable
                </div>
              )}
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
                {item.google_drive_url && (
                  <a
                    href={item.google_drive_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-ziwa-600 hover:text-ziwa-700 font-medium mt-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M7.71 3.5L1.15 15l4.58 7.5h13.54l4.58-7.5L17.29 3.5H7.71zm.58 1h8.42l5.44 9.5H2.85l5.44-9.5zM5.07 15h13.86l-3.47 5.5H8.54L5.07 15z"/>
                    </svg>
                    View in Google Drive
                  </a>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export type { MediaItem }
