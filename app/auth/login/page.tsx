'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Eye, EyeOff, Loader2 } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirectTo') || '/'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClient()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (authError) {
      setError('Invalid email or password. Please try again.')
      setLoading(false)
      return
    }

    // Session is stored in a cookie by @supabase/ssr.
    // "Remember me" is handled by the cookie expiry set on the server.
    // Here we set a client hint that the auth callback can act on.
    if (rememberMe) {
      localStorage.setItem('sa_remember', '1')
    }

    router.push(redirectTo)
    router.refresh()
  }

  return (
    <div className="p-8">
      {/* Heading */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white tracking-tight">Welcome back</h2>
        {/* Thin brand accent underline */}
        <div className="mt-1.5 h-0.5 w-10 rounded-full bg-brand-400" />
        <p className="text-brand-200 text-sm mt-3">Sign in to continue</p>
      </div>

      {error && (
        <div className="mb-5 p-3 rounded-lg bg-red-500/20 border border-red-500/30 text-red-200 text-sm animate-fade-in">
          {error}
        </div>
      )}

      <form onSubmit={handleLogin} className="space-y-5">
        {/* Email */}
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-brand-100 mb-1.5">
            Email address
          </label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
            className="w-full px-4 py-3 rounded-lg bg-white/15 border border-white/25 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-white/40 focus:bg-white/20 focus:border-white/50 transition text-sm"
          />
        </div>

        {/* Password */}
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-brand-100 mb-1.5">
            Password
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-3 pr-10 rounded-lg bg-white/15 border border-white/25 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-white/40 focus:bg-white/20 focus:border-white/50 transition text-sm"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white/80 transition"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Remember me + Forgot password */}
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              id="remember-me"
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="w-4 h-4 rounded accent-white"
            />
            <span className="text-sm text-brand-200">Remember me</span>
          </label>
          <Link
            href="/auth/forgot-password"
            className="text-sm text-brand-200 hover:text-white transition underline underline-offset-2"
          >
            Forgot password?
          </Link>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          id="btn-login"
          className="w-full py-3 rounded-lg bg-gradient-to-r from-brand-500 to-brand-400 text-white font-semibold hover:opacity-90 active:scale-[0.98] transition shadow-lg shadow-brand-900/40 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
        >
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      {/* Divider + Register Link */}
      <div className="mt-8 text-center border-t border-white/10 pt-6">
        <p className="text-sm text-brand-200">
          New here?{' '}
          <Link href="/register" className="text-white hover:underline font-semibold">
            Apply to join as a Sales Intern
          </Link>
        </p>
      </div>
    </div>
  )
}
