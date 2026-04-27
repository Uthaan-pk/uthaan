'use client'

import { useActionState, useState } from 'react'
import { convertDemoRequest, type OnboardResult } from '../actions'
import { SCHOOL_PLANS, type SchoolPlan } from '@/lib/schoolPlans'

type RequestedPlan = 'not_sure' | 'starter' | 'growth' | 'pro' | 'enterprise'

type Props = {
  requestId: string
  schoolName: string
  contactName: string
  email: string
  requestedPlan: RequestedPlan
}

const PLAN_LABELS: Record<SchoolPlan, string> = {
  pilot: 'Pilot',
  starter: 'Starter',
  growth: 'Growth',
  pro: 'Pro',
  enterprise: 'Enterprise',
}

const REQUESTED_PLAN_LABELS: Record<RequestedPlan, string> = {
  not_sure: 'Not sure yet',
  starter: 'Starter',
  growth: 'Growth',
  pro: 'Pro',
  enterprise: 'Enterprise',
}

function toSlug(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function splitName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/)
  return { firstName: parts[0] ?? '', lastName: parts.slice(1).join(' ') }
}

export default function ConvertDemoRequestForm({
  requestId,
  schoolName,
  contactName,
  email,
  requestedPlan,
}: Props) {
  const [open, setOpen] = useState(false)
  const [slug, setSlug] = useState(toSlug(schoolName))
  const [copied, setCopied] = useState(false)

  const defaultPlan: SchoolPlan = 'pilot'

  const [state, formAction, isPending] = useActionState<OnboardResult | null, FormData>(
    convertDemoRequest,
    null
  )

  const { firstName, lastName } = splitName(contactName)

  async function handleCopy() {
    if (!state?.success) return
    const { credentials: c } = state
    const text = [
      `School: ${c.schoolName}`,
      `School ID: ${c.schoolId}`,
      `Admin: ${c.adminName}`,
      `Email: ${c.adminEmail}`,
      `Password: ${c.password}`,
      `Login at: ${window.location.origin}/login`,
    ].join('\n')
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  if (state?.success) {
    const { credentials: c } = state
    return (
      <div className="mt-4 overflow-hidden rounded-xl border-2 border-[#6fcf6f] shadow-lg">
        <div className="flex items-start justify-between bg-[#1a2e1a] px-5 py-4">
          <div>
            <p className="mb-0.5 text-xs font-semibold uppercase tracking-widest text-[#6fcf6f]">
              School created — request converted
            </p>
            <p className="text-xs text-white/70">
              Pilot plan and admin login are ready. Copy these credentials now; the password cannot be recovered.
            </p>
          </div>
        </div>
        <div className="divide-y divide-gray-100 bg-white">
          {(
            [
              { label: 'School', value: c.schoolName },
              { label: 'School ID', value: c.schoolId, mono: true },
              { label: 'Admin', value: c.adminName },
              { label: 'Email', value: c.adminEmail },
              { label: 'Password', value: c.password, mono: true, highlight: true },
            ] as Array<{ label: string; value: string; mono?: boolean; highlight?: boolean }>
          ).map(({ label, value, mono, highlight }) => (
            <div key={label} className="flex items-center justify-between px-5 py-3">
              <span className="w-24 shrink-0 text-xs font-medium text-gray-400">{label}</span>
              <span
                className={`flex-1 text-sm ${mono ? 'font-mono' : ''} ${
                  highlight
                    ? 'rounded bg-[#6fcf6f]/10 px-2 py-0.5 font-semibold text-[#1a2e1a]'
                    : 'text-gray-800'
                }`}
              >
                {value}
              </span>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between gap-4 border-t border-gray-100 bg-gray-50 px-5 py-3">
          <p className="text-xs text-gray-500">
            Send credentials to the school admin. They should reset their password after first login.
            Continue setup from the Pilot checklist in Superadmin.
          </p>
          <button
            onClick={handleCopy}
            className={`shrink-0 rounded-lg border px-4 py-2 text-xs font-medium transition-colors ${
              copied
                ? 'border-[#6fcf6f]/40 bg-[#6fcf6f]/20 text-[#1a2e1a]'
                : 'border-[#1a2e1a] bg-[#1a2e1a] text-white hover:bg-[#1a2e1a]/80'
            }`}
          >
            {copied ? 'Copied!' : 'Copy credentials'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="mt-4 border-t border-gray-100 pt-4">
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="rounded-lg border border-[#6fcf6f]/40 bg-[#6fcf6f]/5 px-4 py-2 text-xs font-medium text-[#1a2e1a] transition-colors hover:bg-[#6fcf6f]/10"
        >
          Convert to school →
        </button>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#1a2e1a]">
              Convert to school
            </p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-xs text-gray-400 hover:text-gray-600"
            >
              Cancel
            </button>
          </div>

          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs text-amber-800">
            This is an operator-assisted conversion. It creates the school on Pilot, creates the first admin login,
            and marks this request converted. Copy the generated credentials immediately after creation.
          </div>

          {state?.success === false && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-xs text-red-700">
              {state.error}
            </div>
          )}

          <form action={formAction} className="space-y-4">
            <input type="hidden" name="demo_request_id" value={requestId} />

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-500">School name</label>
                <input
                  name="name"
                  required
                  defaultValue={schoolName}
                  onChange={(e) => setSlug(toSlug(e.target.value))}
                  className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-[#6fcf6f] focus:outline-none focus:ring-2 focus:ring-[#6fcf6f]/30"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-500">
                  Slug{' '}
                  <span className="font-normal text-gray-400">(auto-generated, must be unique)</span>
                </label>
                <input
                  name="slug"
                  required
                  value={slug}
                  onChange={(e) =>
                    setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))
                  }
                  className="rounded-lg border border-gray-200 px-3 py-2 font-mono text-sm text-gray-900 focus:border-[#6fcf6f] focus:outline-none focus:ring-2 focus:ring-[#6fcf6f]/30"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-500">Admin first name</label>
                <input
                  name="firstName"
                  required
                  defaultValue={firstName}
                  className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-[#6fcf6f] focus:outline-none focus:ring-2 focus:ring-[#6fcf6f]/30"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-500">Admin last name</label>
                <input
                  name="lastName"
                  required
                  defaultValue={lastName}
                  className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-[#6fcf6f] focus:outline-none focus:ring-2 focus:ring-[#6fcf6f]/30"
                />
              </div>

              <div className="flex flex-col gap-1 sm:col-span-2">
                <label className="text-xs font-medium text-gray-500">Admin email</label>
                <input
                  name="email"
                  type="email"
                  required
                  defaultValue={email}
                  className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-[#6fcf6f] focus:outline-none focus:ring-2 focus:ring-[#6fcf6f]/30"
                />
              </div>

              <div className="flex flex-col gap-1 sm:col-span-2">
                <label className="text-xs font-medium text-gray-500">
                  Plan
                  <span className="font-normal text-gray-400">
                    {' '}requested: {REQUESTED_PLAN_LABELS[requestedPlan]} · defaulting to Pilot
                  </span>
                </label>
                <select
                  name="plan"
                  defaultValue={defaultPlan}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-[#6fcf6f] focus:outline-none focus:ring-2 focus:ring-[#6fcf6f]/30"
                >
                  {SCHOOL_PLANS.map((p) => (
                    <option key={p} value={p}>
                      {PLAN_LABELS[p]}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="rounded-lg bg-[#1a2e1a] px-5 py-2.5 text-xs font-medium text-[#6fcf6f] transition-colors hover:bg-[#1a2e1a]/80 disabled:opacity-50 active:scale-[0.98]"
            >
              {isPending ? 'Converting…' : 'Create school & admin account'}
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
