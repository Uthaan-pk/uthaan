'use client'

import { useState } from 'react'

export default function CopyLinkButton({
  value,
  copyLabel = 'Copy',
  copiedLabel = 'Copied!',
}: {
  value: string
  copyLabel?: string
  copiedLabel?: string
}) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      setCopied(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="text-xs font-medium text-[#1a2e1a] hover:underline"
    >
      {copied ? copiedLabel : copyLabel}
    </button>
  )
}
