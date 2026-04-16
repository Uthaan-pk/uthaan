'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import AuthPanel from '@/components/auth/AuthPanel'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) return
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', session.user.id)
        .single()
      router.push(roleData?.role === 'superadmin' ? '/superadmin' : '/dashboard')
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleLogin() {
    if (!email || !password) {
      setError('Please enter your email and password.')
      return
    }
    setLoading(true)
    setError('')
    const { error, data } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError('Invalid email or password. Please try again.')
      setLoading(false)
    } else {
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', data.user.id)
        .single()
      router.push(roleData?.role === 'superadmin' ? '/superadmin' : '/dashboard')
    }
  }

  return (
    <div className="min-h-screen flex">

      <AuthPanel />

      {/* Right panel — login form */}
      <div className="flex-1 flex items-center justify-center bg-[#f8f7f4] p-6 sm:p-8">
        <div className="w-full max-w-sm">

          {/* Mobile logo — only visible when left panel is hidden */}
          <div className="lg:hidden mb-8">
            <div className="text-2xl font-bold text-[#1a2e1a]">Uthaan</div>
            <div className="text-xs text-gray-400 uppercase tracking-widest mt-0.5">
              School Management
            </div>
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-1">Welcome back</h1>
          <p className="text-sm text-gray-400 mb-8">Sign in to your school dashboard</p>

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
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
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
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
                placeholder="••••••••••"
                autoComplete="current-password"
                className="w-full bg-white border border-gray-200 rounded-lg px-4 py-3 text-base text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-[#6fcf6f]/40 focus:border-[#6fcf6f] transition-all"
              />
            </div>

            {error && (
              <div role="alert" className="bg-red-50 border border-red-100 rounded-lg px-4 py-3 text-sm text-red-600">
                {error}
              </div>
            )}

            <button
              onClick={handleLogin}
              disabled={loading}
              className="w-full bg-[#1a2e1a] hover:bg-[#243d24] active:scale-[0.98] text-white font-medium py-3 rounded-lg text-sm transition-all disabled:opacity-50 mt-2 min-h-[48px]"
            >
              {loading ? 'Signing in…' : 'Sign in to Uthaan'}
            </button>
          </div>

          <p className="text-center text-xs text-gray-400 mt-6">
            <Link href="/forgot-password" className="text-[#1a2e1a] font-medium hover:underline">
              Forgot password?
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
