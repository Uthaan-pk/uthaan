'use client'

import { useState } from 'react'

export default function MarksTabShell({
  marksEditor,
  gradebook,
}: {
  marksEditor: React.ReactNode
  gradebook: React.ReactNode
}) {
  const [tab, setTab] = useState<'marks' | 'gradebook'>('marks')

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2">
        {([['marks', 'Exam Marks'], ['gradebook', 'Gradebook']] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`uthaan-pill min-h-10 ${
              tab === key
                ? 'uthaan-pill-active'
                : ''
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === 'marks' ? marksEditor : gradebook}
    </div>
  )
}
