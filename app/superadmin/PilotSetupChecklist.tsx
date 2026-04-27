'use client'

import { useState } from 'react'

export type PilotSetupChecklistItem = {
  label: string
  done: boolean
  detail: string
}

export default function PilotSetupChecklist({ items }: { items: PilotSetupChecklistItem[] }) {
  const [open, setOpen] = useState(false)
  const doneCount = items.filter((item) => item.done).length

  return (
    <div className="mb-4 rounded-2xl border border-gray-200 bg-white p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">
            Pilot setup: {doneCount}/{items.length} ready
          </h3>
          <p className="mt-0.5 text-xs text-gray-500">
            Based on existing school data. No extra setup table yet.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-[#1a2e1a] transition-colors hover:border-[#6fcf6f]/50 hover:bg-[#6fcf6f]/5"
          aria-expanded={open}
        >
          {open ? 'Hide setup' : 'View setup'}
        </button>
      </div>

      {open ? (
        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((item) => (
            <div
              key={item.label}
              className={`rounded-xl border px-3 py-2 ${
                item.done
                  ? 'border-[#6fcf6f]/25 bg-[#6fcf6f]/5'
                  : 'border-gray-100 bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-2">
                <span
                  className={`h-2 w-2 rounded-full ${
                    item.done ? 'bg-[#6fcf6f]' : 'bg-gray-300'
                  }`}
                />
                <span className="text-xs font-medium text-gray-900">{item.label}</span>
              </div>
              <div className="mt-1 pl-4 text-[11px] text-gray-400">{item.detail}</div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}
