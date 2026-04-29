'use client'

import { useActionState, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { applySchoolPlan, type SchoolActionResult } from './actions'
import { SCHOOL_PLANS, type SchoolPlan } from '@/lib/schoolPlans'

const INITIAL: SchoolActionResult = { success: false, error: null }

export default function ApplyPlanForm({
  schoolId,
  currentPlan,
}: {
  schoolId: string
  currentPlan: SchoolPlan
}) {
  const router = useRouter()
  const [selected, setSelected] = useState<SchoolPlan>(currentPlan)
  const [state, action, pending] = useActionState(applySchoolPlan, INITIAL)

  useEffect(() => {
    if (state.success) router.refresh()
  }, [state.success, router])

  useEffect(() => {
    setSelected(currentPlan)
  }, [currentPlan])

  const isDirty = selected !== currentPlan

  return (
    <div className="flex flex-col gap-2">
      <form action={action} className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <input type="hidden" name="school_id" value={schoolId} />
        <div>
          <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wide text-gray-400">
            School plan
          </label>
          <select
            name="plan"
            value={selected}
            onChange={(e) => setSelected(e.target.value as SchoolPlan)}
            className="min-w-[150px] rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-900 focus:border-[#6fcf6f] focus:outline-none focus:ring-2 focus:ring-[#6fcf6f]/40"
          >
            {SCHOOL_PLANS.map((plan) => (
              <option key={plan} value={plan}>
                {plan}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col items-start gap-1">
          {isDirty && !pending && (
            <span className="text-[11px] text-amber-600">Unsaved change</span>
          )}
          <button
            type="submit"
            disabled={pending}
            className="rounded-lg bg-[#1a2e1a] px-4 py-2.5 text-xs font-medium text-[#6fcf6f] transition-colors hover:bg-[#243d24] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? 'Applying...' : 'Apply plan'}
          </button>
        </div>
      </form>
      {!isDirty && state.success && (
        <div className="rounded-lg border border-[#6fcf6f]/30 bg-[#6fcf6f]/10 px-3 py-2 text-xs font-medium text-[#1a2e1a]">
          Plan updated ✓
        </div>
      )}
      {state.error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {state.error}
        </div>
      )}
    </div>
  )
}
