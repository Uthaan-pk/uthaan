'use client'

import { useState } from 'react'

export default function AcknowledgeButton({
  announcementId,
  initialAcknowledged,
}: {
  announcementId: string
  initialAcknowledged: boolean
}) {
  const [acknowledged, setAcknowledged] = useState(initialAcknowledged)
  const [loading, setLoading] = useState(false)

  async function handleAcknowledge() {
    if (acknowledged || loading) return
    setLoading(true)
    setAcknowledged(true) // optimistic
    const res = await fetch(`/api/announcements/${announcementId}/acknowledge`, {
      method: 'POST',
    })
    if (!res.ok) setAcknowledged(false) // revert on error
    setLoading(false)
  }

  if (acknowledged) {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] text-green-700 font-medium">
        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
            clipRule="evenodd"
          />
        </svg>
        Acknowledged
      </span>
    )
  }

  return (
    <button
      onClick={handleAcknowledge}
      disabled={loading}
      className="text-[11px] text-gray-400 hover:text-[#1a2e1a] transition-colors disabled:opacity-50"
    >
      {loading ? 'Marking…' : 'Mark as Read'}
    </button>
  )
}
