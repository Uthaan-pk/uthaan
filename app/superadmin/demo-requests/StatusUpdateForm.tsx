'use client'

import { useActionState, useEffect, useState } from 'react'
import {
  updateDemoRequestStatus,
  type DemoRequestStatus,
  type DemoStatusUpdateResult,
} from '../actions'

type Props = {
  requestId: string
  currentStatus: DemoRequestStatus
  reviewedAt: string | null
}

const STATUSES: DemoRequestStatus[] = ['new', 'contacted', 'approved', 'rejected', 'converted']

const INITIAL_STATE: DemoStatusUpdateResult = { success: false, error: null }

export default function StatusUpdateForm({ requestId, currentStatus, reviewedAt }: Props) {
  const [state, formAction, isPending] = useActionState(updateDemoRequestStatus, INITIAL_STATE)
  const [status, setStatus] = useState(currentStatus)
  const [showSaved, setShowSaved] = useState(false)

  useEffect(() => {
    if (!state.success) return
    if (state.savedStatus) setStatus(state.savedStatus)
    setShowSaved(true)
    const timer = setTimeout(() => setShowSaved(false), 3000)
    return () => clearTimeout(timer)
  }, [state])

  return (
    <form action={formAction} className="min-w-[220px] space-y-2">
      <input type="hidden" name="id" value={requestId} />
      <label className="block text-[11px] font-medium uppercase tracking-wide text-gray-400">
        Update status
      </label>
      <select
        name="status"
        value={status}
        onChange={(event) => {
          setStatus(event.target.value as DemoRequestStatus)
          setShowSaved(false)
        }}
        className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-900 focus:border-[#6fcf6f] focus:outline-none focus:ring-2 focus:ring-[#6fcf6f]/30"
      >
        {STATUSES.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-lg bg-[#1a2e1a] px-4 py-2.5 text-sm font-medium text-[#6fcf6f] transition-colors hover:bg-[#243d24] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? 'Saving...' : showSaved ? 'Saved ✓' : 'Save status'}
      </button>
      {state.error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {state.error}
        </div>
      ) : showSaved ? (
        <div className="rounded-lg border border-[#6fcf6f]/30 bg-[#6fcf6f]/10 px-3 py-2 text-xs font-medium text-[#1a2e1a]">
          Status saved.
        </div>
      ) : (
        <div className="text-xs text-gray-400">
          {reviewedAt
            ? `Last reviewed ${new Date(reviewedAt).toLocaleString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}`
            : 'Not reviewed yet'}
        </div>
      )}
    </form>
  )
}
