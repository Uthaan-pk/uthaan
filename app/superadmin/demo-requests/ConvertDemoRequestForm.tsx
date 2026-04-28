'use client'

import { useActionState, useState } from 'react'
import { convertDemoRequest, type OnboardResult, type OnboardCredentials } from '../actions'
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

const PRINT_STYLES = `@media print {
  body > * { visibility: hidden !important; }
  #uthaan-setup-packet { visibility: visible !important; position: fixed; top: 0; left: 0; width: 100%; padding: 40px; background: #fff; box-sizing: border-box; }
  #uthaan-setup-packet * { visibility: visible !important; }
  #uthaan-setup-packet .setup-packet-no-print { display: none !important; }
}`

const LIVE_FEATURES = [
  'Student management', 'Teacher accounts', 'Attendance', 'Marks/results',
  'Report cards', 'Announcements', 'Fees', 'Timetable',
  'Staff-only AI report comments', 'Attendance alert summaries',
]

const NOT_LIVE_FEATURES = [
  'WhatsApp Business API', 'Payment automation',
  'Self-serve signup', 'Fully automated parent linking/import',
]

const FIRST_WEEK = [
  { day: 'Day 1', tasks: ['Admin logs in', 'Add teachers', 'Import students'] },
  { day: 'Day 2', tasks: ['Add timetable', 'Set up fees', 'Post first announcement'] },
  { day: 'Day 3', tasks: ['Mark attendance', 'Add marks/results', 'Review dashboard'] },
]

function SetupPacket({ credentials, loginUrl }: { credentials: OnboardCredentials; loginUrl: string }) {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: PRINT_STYLES }} />
      <div id="uthaan-setup-packet" className="mt-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-sm font-bold text-[#1a2e1a]">Uthaan Setup Packet</h2>
          <button
            type="button"
            onClick={() => window.print()}
            className="setup-packet-no-print rounded-lg border border-[#1a2e1a]/15 bg-[#1a2e1a] px-3 py-2 text-xs font-medium text-[#6fcf6f] transition-colors hover:bg-[#1a2e1a]/80"
          >
            Print setup packet
          </button>
        </div>

        {/* 1. School launch summary */}
        <section className="mb-5">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-gray-400">School launch summary</p>
          <dl className="grid gap-1.5">
            {[
              { label: 'School', value: credentials.schoolName },
              { label: 'Plan', value: credentials.plan ?? 'Pilot' },
              { label: 'Login URL', value: loginUrl, mono: true },
              { label: 'Admin name', value: credentials.adminName },
              { label: 'Admin email', value: credentials.adminEmail, mono: true },
            ].map(({ label, value, mono }) => (
              <div key={label} className="flex gap-4">
                <dt className="w-24 shrink-0 text-xs text-gray-400">{label}</dt>
                <dd className={`text-xs text-gray-800 ${mono ? 'font-mono' : 'font-medium'}`}>{value}</dd>
              </div>
            ))}
          </dl>
        </section>

        <div className="my-4 border-t border-gray-100" />

        {/* 2. Admin login instructions */}
        <section className="mb-5">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-gray-400">Admin login instructions</p>
          <ul className="space-y-1.5 text-xs text-gray-700">
            <li>Uthaan does not share passwords. The admin must set their own password.</li>
            <li>
              Go to <span className="font-mono text-gray-900">{loginUrl}</span>
            </li>
            <li>Click <strong>Forgot Password</strong> and enter the admin email.</li>
            <li>Set a new password before signing in for the first time.</li>
          </ul>
        </section>

        <div className="my-4 border-t border-gray-100" />

        {/* 3. First-week checklist */}
        <section className="mb-5">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-gray-400">First-week checklist</p>
          <div className="grid gap-3 sm:grid-cols-3">
            {FIRST_WEEK.map(({ day, tasks }) => (
              <div key={day}>
                <p className="mb-1.5 text-xs font-medium text-gray-500">{day}</p>
                <ul className="space-y-1">
                  {tasks.map((task) => (
                    <li key={task} className="flex items-center gap-2 text-xs text-gray-600">
                      <span className="h-3 w-3 shrink-0 rounded-sm border border-gray-300" aria-hidden="true" />
                      {task}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        <div className="my-4 border-t border-gray-100" />

        {/* 4. Teacher handoff template */}
        <section className="mb-5">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-gray-400">Teacher handoff template</p>
          <div className="rounded-lg border border-gray-100 bg-gray-50 px-4 py-3 font-mono text-xs text-gray-700">
            <p>Your Uthaan teacher account is ready.</p>
            <p className="mt-1">Login URL: {loginUrl}</p>
            <p className="mt-1">Email: [teacher email]</p>
            <p className="mt-1">Use Forgot Password to set your password before signing in.</p>
          </div>
        </section>

        <div className="my-4 border-t border-gray-100" />

        {/* 5. Student CSV format */}
        <section className="mb-5">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-gray-400">Student CSV format</p>
          <div className="rounded-lg border border-gray-100 bg-gray-50 px-4 py-3 font-mono text-xs text-gray-700">
            <p>name,roll_no,class_num</p>
            <p>Ali Khan,101,5</p>
            <p>Ayesha Ahmed,102,5</p>
          </div>
        </section>

        <div className="my-4 border-t border-gray-100" />

        {/* 6. Honest status */}
        <section>
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-gray-400">What is live</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="mb-2 text-xs font-medium text-green-700">Live now</p>
              <ul className="space-y-1">
                {LIVE_FEATURES.map((item) => (
                  <li key={item} className="flex items-start gap-1.5 text-xs text-gray-600">
                    <span className="mt-0.5 shrink-0 text-green-600">✓</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="mb-2 text-xs font-medium text-gray-400">Not live yet</p>
              <ul className="space-y-1">
                {NOT_LIVE_FEATURES.map((item) => (
                  <li key={item} className="flex items-start gap-1.5 text-xs text-gray-400">
                    <span className="mt-0.5 shrink-0">—</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      </div>
    </>
  )
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
  const [showPacket, setShowPacket] = useState(false)

  const defaultPlan: SchoolPlan = 'pilot'

  const [state, formAction, isPending] = useActionState<OnboardResult | null, FormData>(
    convertDemoRequest,
    null
  )

  const { firstName, lastName } = splitName(contactName)

  async function copyLoginInstructions() {
    if (!state?.success) return

    const origin = window.location.origin
    const { adminEmail } = state.credentials

    await navigator.clipboard.writeText([
      'Your Uthaan account is ready.',
      `Login: ${origin}/login`,
      `Email: ${adminEmail}`,
      'Use Forgot Password to set your password before signing in.',
    ].join('\n'))
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  if (state?.success) {
    const { credentials: c } = state
    const nextSteps = [
      'Share login/reset instructions securely',
      'Add teachers',
      'Import students',
      'Add timetable',
      'Post first announcement',
      'Mark first attendance',
      'Prepare marks/results',
    ]

    return (
      <>
      <div className="mt-4 overflow-hidden rounded-xl border-2 border-[#6fcf6f] shadow-lg">
        <div className="flex items-start justify-between bg-[#1a2e1a] px-5 py-4">
          <div>
            <p className="mb-0.5 text-xs font-semibold uppercase tracking-widest text-[#6fcf6f]">
              School created — request converted
            </p>
            <p className="text-xs text-white/70">
              Your Uthaan account is ready. Ask the admin to use Forgot Password from /login before signing in.
            </p>
          </div>
        </div>
        <div className="divide-y divide-gray-100 bg-white">
          {(
            [
              { label: 'School', value: c.schoolName },
              { label: 'School ID', value: c.schoolId, mono: true },
              { label: 'Plan', value: c.plan === 'pilot' ? 'Pilot' : c.plan ?? 'Pilot' },
              { label: 'Admin', value: c.adminName },
              { label: 'Email', value: c.adminEmail },
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
        <div className="border-t border-[#6fcf6f]/20 bg-[#6fcf6f]/5 px-5 py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Login handoff</p>
              <p className="mt-1 text-sm font-semibold text-[#1a2e1a]">Your Uthaan account is ready.</p>
              <div className="mt-2 grid gap-1 text-xs text-gray-600">
                <span>
                  Login: <span className="font-medium text-gray-900">/login</span>
                </span>
                <span>
                  Email: <span className="font-medium text-gray-900">{c.adminEmail}</span>
                </span>
              </div>
              <p className="mt-2 text-xs leading-5 text-gray-500">
                Use Forgot Password to set your password before signing in.
              </p>
            </div>
            <button
              type="button"
              onClick={copyLoginInstructions}
              className="min-h-10 shrink-0 rounded-lg border border-[#1a2e1a]/15 bg-white px-3 py-2 text-xs font-medium text-[#1a2e1a] transition-colors hover:border-[#6fcf6f]/50 hover:bg-[#6fcf6f]/5"
            >
              {copied ? 'Copied' : 'Copy login instructions'}
            </button>
          </div>
        </div>
        <div className="border-t border-gray-100 bg-gray-50 px-5 py-4">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Next manual steps</p>
          <ol className="mt-3 grid gap-2 sm:grid-cols-2">
            {nextSteps.map((step, index) => (
              <li key={step} className="flex items-start gap-2 text-xs text-gray-600">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#6fcf6f]/15 text-[10px] font-semibold text-[#1a2e1a]">
                  {index + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </div>
        <div className="border-t border-[#6fcf6f]/20 bg-white px-5 py-3">
          <button
            type="button"
            onClick={() => setShowPacket((s) => !s)}
            className="text-xs font-medium text-[#1a2e1a] underline-offset-2 hover:underline"
          >
            {showPacket ? 'Hide setup packet' : 'Open setup packet →'}
          </button>
        </div>
      </div>
      {showPacket && (
        <SetupPacket
          credentials={c}
          loginUrl={`${window.location.origin}/login`}
        />
      )}
      </>
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
            and marks this request converted. Use password reset from /login or your approved manual credential handoff.
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
