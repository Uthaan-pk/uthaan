'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.push('/dashboard')
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleLogin() {
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError('Invalid email or password. Please try again.')
      setLoading(false)
    } else {
      router.push('/dashboard')
    }
  }

  return (
    <div className="min-h-screen flex">

      {/* Left panel — branding */}
      <div className="hidden lg:flex w-1/2 bg-[#1a2e1a] flex-col justify-between p-12">
        <div>
          <div className="text-3xl font-bold text-[#6fcf6f] tracking-tight">Uthaan</div>
          <div className="text-xs text-white/30 uppercase tracking-widest mt-1">School Management System</div>
        </div>

        <div>
          <h2 className="text-4xl font-bold text-white leading-tight mb-4">
            The future of<br />
            Pakistani education<br />
            <span className="text-[#6fcf6f]">starts here.</span>
          </h2>
          <p className="text-white/50 text-sm leading-relaxed max-w-sm">
            Empowering schools across Pakistan with modern tools for attendance, communication, and academic excellence.
          </p>
        </div>

        <div className="flex gap-8">
          <div>
            <div className="text-2xl font-bold text-white">500+</div>
            <div className="text-xs text-white/40 mt-0.5">Students managed</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-white">50+</div>
            <div className="text-xs text-white/40 mt-0.5">Schools onboarded</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-white">99%</div>
            <div className="text-xs text-white/40 mt-0.5">Uptime guaranteed</div>
          </div>
        </div>
      </div>

      {/* Right panel — login form */}
      <div className="flex-1 flex items-center justify-center bg-[#f8f7f4] p-8">
        <div className="w-full max-w-sm">

          {/* Mobile logo */}
          <div className="lg:hidden mb-8">
            <div className="text-2xl font-bold text-[#1a2e1a]">Uthaan</div>
            <div className="text-xs text-gray-400 uppercase tracking-widest mt-0.5">School Management</div>
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-1">Welcome back</h1>
          <p className="text-sm text-gray-400 mb-8">Sign in to your school dashboard</p>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5 uppercase tracking-wide">
                Email address
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
                placeholder="you@school.com"
                className="w-full bg-white border border-gray-200 rounded-lg px-4 py-3 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-[#6fcf6f]/40 focus:border-[#6fcf6f] transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5 uppercase tracking-wide">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
                placeholder="••••••••••"
                className="w-full bg-white border border-gray-200 rounded-lg px-4 py-3 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-[#6fcf6f]/40 focus:border-[#6fcf6f] transition-all"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-100 rounded-lg px-4 py-3 text-xs text-red-600">
                {error}
              </div>
            )}

            <button
              onClick={handleLogin}
              disabled={loading}
              className="w-full bg-[#1a2e1a] hover:bg-[#243d24] text-white font-medium py-3 rounded-lg text-sm transition-colors disabled:opacity-50 mt-2"
            >
              {loading ? 'Signing in...' : 'Sign in to Uthaan'}
            </button>
          </div>

          <p className="text-center text-xs text-gray-300 mt-10">
            © 2026 Uthaan · Built for Pakistan 🇵🇰
          </p>
        </div>
      </div>

    </div>
  )
}