'use client'

import { useActionState, useRef, useState } from 'react'
import { onboardSchool, type OnboardResult } from './actions'

export default function OnboardSchoolForm() {
  const [state, formAction, isPending] = useActionState<OnboardResult | null, FormData>(
    onboardSchool,
    null
  )
  const [slug, setSlug] = useState('')
  const [copied, setCopied] = useState(false)
  const nameRef = useRef<HTMLInputElement>(null)

  function handleNameChange(e: React.ChangeEvent<HTMLInputElement>) {
    const auto = e.target.value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
    setSlug(auto)
  }

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

  // After a successful submission show the credentials card
  if (state?.success) {
    const { credentials: c } = state
    return (
      <div className="rounded-xl overflow-hidden border-2 border-[#6fcf6f] shadow-lg">
        {/* Header */}
        <div className="bg-[#1a2e1a] px-6 py-4 flex items-center justify-between">
          <div>
            <p className="text-[#6fcf6f] text-xs font-semibold uppercase tracking-widest mb-0.5">
              School created successfully
            </p>
            <p className="text-white/70 text-xs">
              Copy these credentials before navigating away — the password cannot be recovered.
            </p>
          </div>
          <span className="text-2xl">🏫</span>
        </div>

        {/* Credential rows */}
        <div className="bg-white divide-y divide-gray-100">
          {[
            { label: 'School', value: c.schoolName },
            { label: 'School ID', value: c.schoolId, mono: true },
            { label: 'Admin name', value: c.adminName },
            { label: 'Email', value: c.adminEmail },
            { label: 'Password', value: c.password ?? 'Generated password unavailable', mono: true, highlight: true },
          ].map(({ label, value, mono, highlight }) => (
            <div key={label} className="flex items-center justify-between px-6 py-3">
              <span className="text-xs text-gray-400 font-medium w-24 shrink-0">{label}</span>
              <span
                className={`text-sm flex-1 ${mono ? 'font-mono' : ''} ${
                  highlight
                    ? 'text-[#1a2e1a] font-semibold bg-[#6fcf6f]/10 px-2 py-0.5 rounded'
                    : 'text-gray-800'
                }`}
              >
                {value}
              </span>
            </div>
          ))}
        </div>

        {/* Footer actions */}
        <div className="bg-gray-50 border-t border-gray-100 px-6 py-4 flex items-center justify-between gap-4">
          <p className="text-xs text-gray-500">
            Send these credentials to the school admin. They should change their password after first login at{' '}
            <span className="font-medium text-gray-700">/reset-password</span>.
          </p>
          <div className="flex gap-2 shrink-0">
            <button
              onClick={handleCopy}
              className={`text-xs font-medium px-4 py-2 rounded-lg border transition-colors ${
                copied
                  ? 'bg-[#6fcf6f]/20 border-[#6fcf6f]/40 text-[#1a2e1a]'
                  : 'bg-[#1a2e1a] border-[#1a2e1a] text-white hover:bg-[#1a2e1a]/80'
              }`}
            >
              {copied ? 'Copied!' : 'Copy credentials'}
            </button>
            <button
              onClick={() => window.location.reload()}
              className="text-xs text-gray-500 hover:text-gray-700 border border-gray-200 px-4 py-2 rounded-lg transition-colors"
            >
              Add another
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <form action={formAction} className="space-y-5">
      {state?.success === false && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
          {state.error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* School name */}
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500 font-medium">School name</label>
          <input
            ref={nameRef}
            name="name"
            required
            placeholder="e.g. Greenfield Academy"
            onChange={handleNameChange}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-[#6fcf6f]/40 focus:border-[#6fcf6f]/60"
          />
        </div>

        {/* Slug */}
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500 font-medium">
            School slug{' '}
            <span className="text-gray-400 font-normal">(auto-generated, must be unique)</span>
          </label>
          <input
            name="slug"
            required
            placeholder="e.g. greenfield"
            value={slug}
            onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 font-mono placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-[#6fcf6f]/40 focus:border-[#6fcf6f]/60"
          />
        </div>

        {/* Admin first name */}
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500 font-medium">Admin first name</label>
          <input
            name="firstName"
            required
            placeholder="e.g. Sarah"
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-[#6fcf6f]/40 focus:border-[#6fcf6f]/60"
          />
        </div>

        {/* Admin last name */}
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500 font-medium">Admin last name</label>
          <input
            name="lastName"
            required
            placeholder="e.g. Khan"
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-[#6fcf6f]/40 focus:border-[#6fcf6f]/60"
          />
        </div>

        {/* Admin email — full width */}
        <div className="flex flex-col gap-1 sm:col-span-2">
          <label className="text-xs text-gray-500 font-medium">Admin email</label>
          <input
            name="email"
            type="email"
            required
            placeholder="e.g. sarah.khan@greenfield.edu"
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-[#6fcf6f]/40 focus:border-[#6fcf6f]/60"
          />
        </div>
      </div>

      <div className="flex items-center gap-3 pt-1">
        <button
          type="submit"
          disabled={isPending}
          className="bg-[#1a2e1a] text-white text-xs font-medium px-5 py-2.5 rounded-lg hover:bg-[#1a2e1a]/80 disabled:opacity-50 transition-colors active:scale-[0.98]"
        >
          {isPending ? 'Creating…' : 'Create school & admin'}
        </button>
        <p className="text-xs text-gray-400">
          A secure password will be auto-generated for the admin.
        </p>
      </div>
    </form>
  )
}
