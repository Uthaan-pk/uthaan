'use client'

import { useActionState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  deleteSchool,
  impersonateSchool,
  toggleSchoolStatus,
  type SchoolActionResult,
} from './actions'

type Props = {
  schoolId: string
  schoolName: string
  isActive: boolean
}

const INITIAL_STATE: SchoolActionResult = { success: false, error: null }

export default function SchoolRowActions({
  schoolId,
  schoolName,
  isActive,
}: Props) {
  const router = useRouter()
  const deleteConfirmedRef = useRef(false)
  const [statusState, statusAction, statusPending] = useActionState(
    toggleSchoolStatus.bind(null, schoolId, isActive),
    INITIAL_STATE
  )
  const [deleteState, deleteAction, deletePending] = useActionState(
    deleteSchool.bind(null, schoolId),
    INITIAL_STATE
  )

  useEffect(() => {
    if (statusState.success || deleteState.success) {
      router.refresh()
    }
    deleteConfirmedRef.current = false
  }, [deleteState.error, deleteState.success, router, statusState.error, statusState.success])

  const feedback = deleteState.error
    ? deleteState.error
    : statusState.error
      ? statusState.error
      : deleteState.message
        ? deleteState.message
        : statusState.message

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <form action={impersonateSchool.bind(null, schoolId)}>
          <button
            type="submit"
            className="min-h-9 rounded-lg border border-gray-200 px-2.5 py-1 text-xs text-[#1a2e1a]/60 transition-colors hover:border-[#6fcf6f]/50 hover:text-[#1a2e1a]"
          >
            Browse
          </button>
        </form>

        <form action={statusAction}>
          <button
            type="submit"
            disabled={statusPending}
            className={`min-h-9 rounded-lg border px-2.5 py-1 text-xs transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
              isActive
                ? 'border-amber-200 text-amber-700 hover:border-amber-400 hover:text-amber-800'
                : 'border-green-200 text-green-700 hover:border-green-400 hover:text-green-800'
            }`}
          >
            {statusPending ? 'Saving...' : isActive ? 'Suspend' : 'Activate'}
          </button>
        </form>

        <form
          action={deleteAction}
          onSubmit={(event) => {
            if (!deleteConfirmedRef.current) {
              event.preventDefault()
              if (confirm(`Delete "${schoolName}"? This only works for schools without linked data.`)) {
                deleteConfirmedRef.current = true
                event.currentTarget.requestSubmit()
              }
            }
          }}
        >
          <button
            type="submit"
            disabled={deletePending}
            className="min-h-9 rounded-lg border border-red-100 px-2.5 py-1 text-xs text-red-500 transition-colors hover:border-red-300 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {deletePending ? 'Deleting...' : 'Delete'}
          </button>
        </form>
      </div>

      {feedback ? (
        <div
          className={`max-w-[260px] rounded-lg border px-3 py-2 text-left text-xs ${
            statusState.error || deleteState.error
              ? 'border-red-200 bg-red-50 text-red-700'
              : 'border-[#6fcf6f]/30 bg-[#6fcf6f]/10 text-[#1a2e1a]'
          }`}
        >
          {feedback}
        </div>
      ) : null}
    </div>
  )
}
