'use client'

import { useState } from 'react'
import { HelpCircle } from 'lucide-react'
import { HelpModal } from './HelpModal'

export function HelpButton({ pageKey }: { pageKey: string }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Open help guide"
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
      >
        <HelpCircle className="h-4 w-4" />
      </button>

      {open && <HelpModal pageKey={pageKey} onClose={() => setOpen(false)} />}
    </>
  )
}
