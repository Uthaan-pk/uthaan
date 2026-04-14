'use client'

import { useEffect, useState } from 'react'

type AckData = {
  count: number
  total: number
  names: string[]
}

export default function AcknowledgementStatus({
  announcementId,
}: {
  announcementId: string
}) {
  const [data, setData] = useState<AckData | null>(null)

  useEffect(() => {
    fetch(`/api/announcements/${announcementId}/acknowledgements`)
      .then((r) => r.json())
      .then((d: AckData) => setData(d))
      .catch(() => {})
  }, [announcementId])

  if (!data) {
    return <span className="text-[10px] text-gray-300">Loading…</span>
  }

  return (
    <span className="text-[10px] text-gray-400">
      {data.count} of {data.total} acknowledged
      {data.names.length > 0 && (
        <span className="text-gray-300 ml-1">({data.names.join(', ')})</span>
      )}
    </span>
  )
}
