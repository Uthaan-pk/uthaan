'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import AuthPanel from '@/components/auth/AuthPanel'

export default function ForgotPasswordPage() {
  const [email, setEmail]     = useState('')
  const [sent, setSent]       = useState(false)
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  async function handleSubmit() {
    if (!email) {
      setError('Please enter your email address.')
      return
    }
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    setLoading(false)
    if (error) {
      setError('Could not send reset email. Please check the address and try again.')
    } else {
      setSent(true)
    }
  }

  return (
    <div className="min-h-screen flex">
      <AuthPanel />

      <div className="flex-1 flex items-center justify-center bg-[#f8f7f4] p-6 sm:p-8">
        <div className="w-full max-w-sm">

          <div className="lg:hidden mb-8">
            <div className="text-2xl font-bold text-[#1a2e1a]">Uthaan</div>
            <div className="text-xs text-gray-400 uppercase tracking-widest mt-0.5">
              School Management
            </div>
          </div>

          {sent ? (
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900 mb-2">Check your inbox</div>
              <p className="text-sm text-gray-500 mb-6">
                If an account exists for <span className="font-medium text-gray-700">{email}</span>,
                a password reset link has been sent.
              </p>
              <Link
                href="/login"
                className="text-sm text-[#1a2e1a] font-medium hover:underline"
              >
                ← Back to sign in
              </Link>
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-bold text-gray-900 mb-1">Reset password</h1>
              <p className="text-sm text-gray-400 mb-8">
                Enter your school email and we&apos;ll send a reset link.
              </p>

              <div className="space-y-4">
                <div>
                  <label
                    htmlFor="email"
                    className="block text-xs font-medium text-gray-600 mb-1.5 uppercase tracking-wide"
                  >
                    Email address
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                    placeholder="you@school.com"
                    autoComplete="email"
                    className="w-full bg-white border border-gray-200 rounded-lg px-4 py-3 text-base text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-[#6fcf6f]/40 focus:border-[#6fcf6f] transition-all"
                  />
                </div>

                {error && (
                  <div role="alert" className="bg-red-50 border border-red-100 rounded-lg px-4 py-3 text-sm text-red-600">
                    {error}
                  </div>
                )}

                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="w-full bg-[#1a2e1a] hover:bg-[#243d24] active:scale-[0.98] text-white font-medium py-3 rounded-lg text-sm transition-all disabled:opacity-50 mt-2 min-h-[48px]"
                >
                  {loading ? 'Sending…' : 'Send reset link'}
                </button>
              </div>

              <p className="text-center text-xs text-gray-400 mt-6">
                <Link href="/login" className="text-[#1a2e1a] font-medium hover:underline">
                  ← Back to sign in
                </Link>
              </p>
            </>
          )}

          <p className="text-center text-xs text-gray-300 mt-8">
            © 2026 Uthaan · Built for Pakistan
          </p>
        </div>
      </div>
    </div>
  )
}
