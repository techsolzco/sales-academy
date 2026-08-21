import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Sign In | Sales Academy',
  description: 'Sign in to your Sales Academy account.',
}

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-brand-800 to-brand-600 flex items-center justify-center p-4 relative overflow-hidden">

      {/* Decorative depth circles */}
      <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-brand-500/10 blur-3xl pointer-events-none" />
      <div className="absolute top-1/3 -right-24 w-72 h-72 rounded-full bg-brand-400/10 blur-2xl pointer-events-none" />
      <div className="absolute -bottom-20 left-1/4 w-64 h-64 rounded-full bg-slate-700/20 blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Logo / Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 mb-4">
            <svg
              className="w-8 h-8 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Sales Academy
          </h1>
          <p className="text-brand-200 text-sm mt-1">
            Elevate your sales performance
          </p>
        </div>

        {/* Auth card */}
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl shadow-2xl overflow-hidden">
          {children}
        </div>
      </div>
    </div>
  )
}
