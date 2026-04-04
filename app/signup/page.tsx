'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import AuthPanel from '@/components/auth/AuthPanel'

const ROLES = [
  { value: 'student', label: 'Student' },
  { value: 'teacher', label: 'Teacher' },
  { value: 'parent', label: 'Parent' },
]

const TEACHER_CODE = process.env.NEXT_PUBLIC_TEACHER_CODE ?? ''
const PARENT_CODE = process.env.NEXT_PUBLIC_PARENT_CODE ?? ''

/**
 * Returns a plain-language description of what the access code is
 * and where to get it — shown below the input field.
 */
function getCodeHint(role: string): string {
  if (role === 'teacher') {
    return 'Your school admin will give you this code. It confirms you are a staff member at a registered school.'
  }
  if (role === 'parent') {
    return "Your school admin will give you this code when your child is enrolled. Contact the school office if you don't have it."
  }
  return ''
}

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('student')
  const [accessCode, setAccessCode] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.push('/dashboard')
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Reset access code and errors when role changes
  useEffect(() => {
    setAccessCode('')
    setError('')
  }, [role])

  function validateForm(): string | null {
    if (!email) return 'Please enter your email address.'
    if (!password || password.length < 6) return 'Password must be at least 6 characters.'
    if (role === 'teacher' && accessCode !== TEACHER_CODE) {
      return 'Invalid teacher code. Contact your school admin for the correct code.'
    }
    if (role === 'parent' && accessCode !== PARENT_CODE) {
      return 'Invalid parent code. Contact your school admin for the correct code.'
    }
    return null
  }

  async function handleSignup() {
    setError('')
    setSuccess('')

    const validationError = validateForm()
    if (validationError) {
      setError(validationError)
      return
    }

    setLoading(true)

    const { data, error: signUpError } = await supabase.auth.signUp({ email, password })
    if (signUpError) {
      setError(signUpError.message)
      setLoading(false)
      return
    }

    const userId = data.user?.id
    if (!userId) {
      setError('Signup succeeded but no user returned. Please try logging in.')
      setLoading(false)
      return
    }

    // Assign role via API route (uses service role key, bypasses RLS)
    const res = await fetch('/api/auth/assign-role', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role }),
    })

    if (!res.ok) {
      setError('Account created but role assignment failed. Please contact your school admin.')
      setLoading(false)
      setTimeout(() => router.push('/dashboard'), 3000)
      return
    }

    setSuccess('Account created successfully! Taking you to your dashboard…')
    setLoading(false)
    router.push('/dashboard')
  }

  const needsCode = role === 'teacher' || role === 'parent'
  const codeLabel = role === 'teacher' ? 'Teacher access code' : 'Parent access code'
  const codeHint = getCodeHint(role)

  return (
    <div className="min-h-screen flex">

      <AuthPanel />

      {/* Right panel — signup form */}
      <div className="flex-1 flex items-center justify-center bg-[#f8f7f4] p-6 sm:p-8">
        <div className="w-full max-w-sm">

          {/* Mobile logo */}
          <div className="lg:hidden mb-8">
            <div className="text-2xl font-bold text-[#1a2e1a]">Uthaan</div>
            <div className="text-xs text-gray-400 uppercase tracking-widest mt-0.5">
              School Management
            </div>
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-1">Create account</h1>
          <p className="text-sm text-gray-400 mb-8">Join your school on Uthaan</p>

          <div className="space-y-4">

            {/* Role selector — shown first so the form adapts below it */}
            <div>
              <label
                htmlFor="role"
                className="block text-xs font-medium text-gray-600 mb-1.5 uppercase tracking-wide"
              >
                I am a
              </label>
              <select
                id="role"
                value={role}
                onChange={e => setRole(e.target.value)}
                className="w-full bg-white border border-gray-200 rounded-lg px-4 py-3 text-base text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#6fcf6f]/40 focus:border-[#6fcf6f] transition-all appearance-none"
              >
                {ROLES.map(r => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>

              {/* How-do-I-join explanation — contextual per role */}
              {role === 'student' && (
                <p className="mt-2 text-xs text-gray-400 leading-relaxed">
                  Students are added by your school admin. Create your account here,
                  then your admin will link you to your class.
                </p>
              )}
            </div>

            {/* Access code — shown for teacher and parent with clear explanation */}
            {needsCode && (
              <div>
                <label
                  htmlFor="accessCode"
                  className="block text-xs font-medium text-gray-600 mb-1.5 uppercase tracking-wide"
                >
                  {codeLabel}
                </label>
                <input
                  id="accessCode"
                  type="text"
                  value={accessCode}
                  onChange={e => setAccessCode(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSignup()}
                  placeholder="Enter your access code"
                  autoComplete="off"
                  className="w-full bg-white border border-gray-200 rounded-lg px-4 py-3 text-base text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-[#6fcf6f]/40 focus:border-[#6fcf6f] transition-all"
                />
                <p className="mt-2 text-xs text-gray-400 leading-relaxed">
                  {codeHint}
                </p>
              </div>
            )}

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
                onKeyDown={e => e.key === 'Enter' && handleSignup()}
                placeholder="you@school.com"
                autoComplete="email"
                className="w-full bg-white border border-gray-200 rounded-lg px-4 py-3 text-base text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-[#6fcf6f]/40 focus:border-[#6fcf6f] transition-all"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-xs font-medium text-gray-600 mb-1.5 uppercase tracking-wide"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSignup()}
                placeholder="At least 6 characters"
                autoComplete="new-password"
                className="w-full bg-white border border-gray-200 rounded-lg px-4 py-3 text-base text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-[#6fcf6f]/40 focus:border-[#6fcf6f] transition-all"
              />
            </div>

            {success && (
              <div role="status" className="bg-green-50 border border-green-100 rounded-lg px-4 py-3 text-sm text-green-700">
                {success}
              </div>
            )}

            {error && (
              <div role="alert" className="bg-red-50 border border-red-100 rounded-lg px-4 py-3 text-sm text-red-600">
                {error}
              </div>
            )}

            <button
              onClick={handleSignup}
              disabled={loading}
              className="w-full bg-[#1a2e1a] hover:bg-[#243d24] active:scale-[0.98] text-white font-medium py-3 rounded-lg text-sm transition-all disabled:opacity-50 mt-2 min-h-[48px]"
            >
              {loading ? 'Creating account…' : 'Create account'}
            </button>
          </div>

          {/* Admin note — visible to school owners who land on signup */}
          <div className="mt-6 bg-amber-50 border border-amber-100 rounded-lg px-4 py-3">
            <p className="text-xs text-amber-800 leading-relaxed">
              <span className="font-medium">Setting up a new school?</span>{' '}
              Admin accounts are created by the Uthaan team.{' '}
              <a
                href="mailto:hello@uthaan.app"
                className="underline hover:no-underline"
              >
                Contact us to get started.
              </a>
            </p>
          </div>

          <p className="text-center text-xs text-gray-400 mt-6">
            Already have an account?{' '}
            <Link href="/login" className="text-[#1a2e1a] font-medium hover:underline">
              Sign in
            </Link>
          </p>

          <p className="text-center text-xs text-gray-300 mt-8">
            © 2026 Uthaan · Built for Pakistan
          </p>
        </div>
      </div>

    </div>
  )
}
