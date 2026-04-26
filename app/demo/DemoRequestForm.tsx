'use client'

import Link from 'next/link'
import { useActionState, useEffect, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { submitDemoRequest, type DemoRequestState } from './actions'

const VALID_PLAN_PARAMS = ['starter', 'growth', 'pro', 'enterprise', 'not_sure'] as const
type ValidPlanParam = (typeof VALID_PLAN_PARAMS)[number]

function toValidPlan(value: string | null): ValidPlanParam {
  return VALID_PLAN_PARAMS.includes(value as ValidPlanParam) ? (value as ValidPlanParam) : 'not_sure'
}

const initialState: DemoRequestState = {
  error: null,
  success: false,
}

export default function DemoRequestForm() {
  const searchParams = useSearchParams()
  const preselectedPlan = toValidPlan(searchParams.get('plan'))
  const submitLockedRef = useRef(false)

  const [state, formAction, pending] = useActionState(submitDemoRequest, initialState)
  const formDisabled = pending || state.success

  useEffect(() => {
    if (!pending && !state.success) {
      submitLockedRef.current = false
    }
  }, [pending, state.success])

  return (
    <form
      action={formAction}
      className="space-y-4"
      aria-busy={pending}
      onSubmit={(event) => {
        if (submitLockedRef.current) {
          event.preventDefault()
          return
        }

        submitLockedRef.current = true
      }}
    >
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        className="hidden"
        aria-hidden="true"
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="md:col-span-2">
          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-gray-500">
            School name *
          </label>
          <input
            name="school_name"
            required
            disabled={formDisabled}
            placeholder="Al Noor School"
            className="w-full rounded-xl border border-white/10 bg-[#0f151d] px-4 py-3 text-sm text-white placeholder:text-gray-500 focus:border-[#22a862] focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-gray-500">
            Contact name *
          </label>
          <input
            name="contact_name"
            required
            disabled={formDisabled}
            placeholder="Ayesha Khan"
            className="w-full rounded-xl border border-white/10 bg-[#0f151d] px-4 py-3 text-sm text-white placeholder:text-gray-500 focus:border-[#22a862] focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-gray-500">
            Role title
          </label>
          <input
            name="role_title"
            disabled={formDisabled}
            placeholder="Principal / Admin"
            className="w-full rounded-xl border border-white/10 bg-[#0f151d] px-4 py-3 text-sm text-white placeholder:text-gray-500 focus:border-[#22a862] focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-gray-500">
            Email *
          </label>
          <input
            type="email"
            name="email"
            required
            disabled={formDisabled}
            placeholder="you@school.com"
            className="w-full rounded-xl border border-white/10 bg-[#0f151d] px-4 py-3 text-sm text-white placeholder:text-gray-500 focus:border-[#22a862] focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-gray-500">
            Phone
          </label>
          <input
            name="phone"
            disabled={formDisabled}
            placeholder="+92 300 1234567"
            className="w-full rounded-xl border border-white/10 bg-[#0f151d] px-4 py-3 text-sm text-white placeholder:text-gray-500 focus:border-[#22a862] focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-gray-500">
            City
          </label>
          <input
            name="city"
            disabled={formDisabled}
            placeholder="Lahore"
            className="w-full rounded-xl border border-white/10 bg-[#0f151d] px-4 py-3 text-sm text-white placeholder:text-gray-500 focus:border-[#22a862] focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-gray-500">
            Student count
          </label>
          <input
            type="number"
            min="0"
            name="student_count"
            disabled={formDisabled}
            placeholder="350"
            className="w-full rounded-xl border border-white/10 bg-[#0f151d] px-4 py-3 text-sm text-white placeholder:text-gray-500 focus:border-[#22a862] focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-gray-500">
            Plan interested in
          </label>
          <select
            name="requested_plan"
            defaultValue={preselectedPlan}
            disabled={formDisabled}
            className="w-full rounded-xl border border-white/10 bg-[#0f151d] px-4 py-3 text-sm text-white focus:border-[#22a862] focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
          >
            <option value="not_sure">Not sure yet</option>
            <option value="starter">Starter</option>
            <option value="growth">Growth</option>
            <option value="pro">Pro</option>
            <option value="enterprise">Enterprise</option>
          </select>
        </div>

        <div className="md:col-span-2">
          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-gray-500">
            Message
          </label>
          <textarea
            name="message"
            rows={5}
            disabled={formDisabled}
            placeholder="Tell us a little about your school or what you want to see in the demo."
            className="w-full rounded-xl border border-white/10 bg-[#0f151d] px-4 py-3 text-sm text-white placeholder:text-gray-500 focus:border-[#22a862] focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
          />
        </div>
      </div>

      {state.error ? (
        <div className="rounded-xl border border-red-900/60 bg-red-950/40 px-4 py-3 text-sm text-red-200">
          {state.error}
        </div>
      ) : null}

      {state.success ? (
        <div className="rounded-xl border border-[#1a7a4a]/60 bg-[#12311f] px-4 py-3 text-sm text-[#baf3d0]">
          Request received. We&apos;ll review it manually and reach out soon.
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={formDisabled}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#1a7a4a] px-5 py-3 text-sm font-medium text-white transition hover:bg-[#22a862] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" aria-hidden="true" />
              Submitting…
            </>
          ) : state.success ? (
            'Request sent'
          ) : (
            'Request demo'
          )}
        </button>
        <Link
          href="/login"
          className="text-sm text-gray-400 transition hover:text-white"
        >
          Already have an account? Login
        </Link>
      </div>
    </form>
  )
}
