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
      <div className="flex gap-1 mb-4">
        {([['marks', 'Exam Marks'], ['gradebook', 'Gradebook']] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              tab === key
                ? 'bg-[#1a2e1a] text-[#6fcf6f]'
                : 'bg-white border border-gray-200 text-gray-500 hover:border-gray-300 hover:text-gray-700'
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
