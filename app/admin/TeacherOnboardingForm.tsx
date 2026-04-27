'use client'

import { useActionState, useEffect, useState } from 'react'
import Link from 'next/link'
import {
  createTeacherAccount,
  type TeacherOnboardingResult,
} from './actions'

const INITIAL_STATE: TeacherOnboardingResult = { success: false, error: null }

export default function TeacherOnboardingForm() {
  const [state, formAction, isPending] = useActionState(createTeacherAccount, INITIAL_STATE)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!state.success) return
    setName('')
    setEmail('')
  }, [state.success])

  async function copyLoginInstructions() {
    if (!state.teacher) return

    const origin = window.location.origin
    await navigator.clipboard.writeText([
      'Your Uthaan account is ready.',
      `Login: ${origin}/login`,
      `Email: ${state.teacher.email}`,
      'Use Forgot Password to set your password before signing in.',
    ].join('\n'))
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  return (
    <section id="teacher-onboarding" className="rounded-2xl border border-gray-100 bg-white p-5">
      <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold text-gray-900">Teacher onboarding</h2>
          <p className="mt-1 text-xs leading-5 text-gray-500">
            Create a teacher login for this school. Class and subject assignment stays in Timetable.
          </p>
        </div>
        <span className="mt-1 w-fit rounded-full border border-[#6fcf6f]/25 bg-[#6fcf6f]/10 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wide text-[#1a2e1a]">
          Staff setup
        </span>
      </div>

      <form action={formAction} className="grid gap-3 lg:grid-cols-[1fr_1fr_auto] lg:items-end">
        <div>
          <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wide text-gray-400">
            Teacher name
          </label>
          <input
            name="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Ayesha Khan"
            className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-300 focus:border-[#6fcf6f] focus:outline-none focus:ring-2 focus:ring-[#6fcf6f]/40"
            required
          />
        </div>

        <div>
          <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wide text-gray-400">
            Teacher email
          </label>
          <input
            name="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="teacher@school.com"
            className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-300 focus:border-[#6fcf6f] focus:outline-none focus:ring-2 focus:ring-[#6fcf6f]/40"
            required
          />
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="min-h-11 rounded-lg bg-[#1a2e1a] px-4 py-2.5 text-sm font-medium text-[#6fcf6f] transition-colors hover:bg-[#243d24] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? 'Creating...' : 'Create teacher'}
        </button>
      </form>

      {state.error ? (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.error}
        </div>
      ) : state.success && state.teacher ? (
        <div className="mt-4 rounded-xl border border-[#6fcf6f]/30 bg-[#6fcf6f]/10 px-4 py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="text-sm font-semibold text-[#1a2e1a]">Teacher account created</div>
              <div className="mt-1 text-sm text-gray-700">{state.teacher.email}</div>
              <p className="mt-2 text-xs leading-5 text-gray-600">
                Your Uthaan account is ready. Ask the teacher to open <Link href="/login" className="font-medium text-[#1a2e1a] hover:underline">/login</Link> and use Forgot Password to set their password before signing in.
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
      ) : (
        <p className="mt-4 text-xs leading-5 text-gray-500">
          No password is displayed here. Use reset-password instructions or your approved manual credential handoff.
        </p>
      )}
    </section>
  )
}
