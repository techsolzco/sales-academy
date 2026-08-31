'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Eye, EyeOff, Loader2, ArrowRight } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirectTo') || '/'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const urlError = searchParams.get('error')
  const [error, setError] = useState<string | null>(
    urlError === 'invalid_reset_link'
      ? 'Your password reset link has expired or is invalid. Please request a new one.'
      : null
  )


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

    if (rememberMe) {
      localStorage.setItem('sa_remember', '1')
    }

    router.push(redirectTo)
    router.refresh()
  }

  return (
    <div className="p-8 sm:p-10">
      {/* Heading */}
      <div className="mb-7">
        <h2 className="text-2xl font-bold text-white tracking-tight">Welcome back</h2>
        <div className="w-10 h-0.5 bg-gradient-to-r from-brand-400 to-transparent mt-2 mb-3 rounded-full" />
        <p className="text-brand-200 text-sm">Sign in to continue to your dashboard</p>
      </div>

      {error && (
        <div className="mb-5 p-3.5 rounded-xl bg-red-500/20 border border-red-500/30 text-red-200 text-sm animate-fade-in flex items-center gap-2">
          <span className="text-red-400">⚠</span>
          {error}
        </div>
      )}

      <form onSubmit={handleLogin} className="space-y-5">
        {/* Email */}
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-brand-100 mb-2">
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
            className="w-full px-4 py-3 rounded-xl bg-white/15 border border-white/25 text-white placeholder-white/35 focus:outline-none focus:ring-2 focus:ring-brand-400/60 focus:border-white/50 focus:bg-white/20 transition-all text-sm"
          />
        </div>

        {/* Password */}
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-brand-100 mb-2">
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
              className="w-full px-4 py-3 pr-11 rounded-xl bg-white/15 border border-white/25 text-white placeholder-white/35 focus:outline-none focus:ring-2 focus:ring-brand-400/60 focus:border-white/50 focus:bg-white/20 transition-all text-sm"
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
          <label className="flex items-center gap-2.5 cursor-pointer select-none">
            <input
              id="remember-me"
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="w-4 h-4 rounded accent-brand-400"
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
          className="w-full py-3 rounded-xl bg-gradient-to-r from-brand-500 to-brand-400 hover:from-brand-400 hover:to-brand-300 text-white font-semibold active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm shadow-lg shadow-brand-900/40"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Signing in…
            </>
          ) : (
            <>
              Sign in
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      {/* Register Link */}
      <div className="mt-7 text-center border-t border-white/10 pt-6">
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
