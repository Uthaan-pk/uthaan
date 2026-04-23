'use client'

import { useEffect } from 'react'
import { X } from 'lucide-react'
import { HELP_VIDEOS } from '@/lib/helpVideos'

export function HelpModal({
  pageKey,
  onClose,
}: {
  pageKey: string
  onClose: () => void
}) {
  const video = HELP_VIDEOS[pageKey]

  // Close on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  if (!video) return null

  const isPlaceholder = video.youtubeId === 'PLACEHOLDER'

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[70] bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />

      {/* Panel */}
      <div
        role="dialog"
        aria-label={video.title}
        aria-modal="true"
        className="fixed inset-0 z-[71] flex items-center justify-center px-4"
      >
        <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl">
          {/* Header */}
          <div className="flex items-start justify-between gap-3 border-b border-gray-100 px-5 py-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#6fcf6f]">
                How-to guide
              </p>
              <h2 className="mt-0.5 text-sm font-semibold text-gray-900">
                {video.title}
              </h2>
            </div>
            <button
              onClick={onClose}
              aria-label="Close help"
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Video area */}
          <div className="bg-gray-950 px-5 py-5">
            {isPlaceholder ? (
              <div className="flex aspect-video w-full items-center justify-center rounded-xl border border-white/10 bg-gray-900">
                <div className="text-center">
                  <div className="mb-2 text-3xl">🎬</div>
                  <p className="text-sm font-medium text-white/80">
                    Video coming soon
                  </p>
                  <p className="mt-1 text-xs text-white/40">
                    We&rsquo;re recording this guide — check back shortly.
                  </p>
                </div>
              </div>
            ) : (
              <div className="aspect-video w-full overflow-hidden rounded-xl">
                <iframe
                  src={`https://www.youtube-nocookie.com/embed/${video.youtubeId}?rel=0&modestbranding=1`}
                  title={video.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="h-full w-full"
                />
              </div>
            )}
          </div>

          {/* Description */}
          <div className="px-5 py-4">
            <p className="text-sm leading-relaxed text-gray-600">
              {video.description}
            </p>
          </div>
        </div>
      </div>
    </>
  )
}
