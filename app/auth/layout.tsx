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
    <div className="min-h-screen relative bg-gradient-to-br from-slate-900 via-brand-900 to-brand-700 flex items-center justify-center p-4 overflow-hidden">
      {/* Decorative background blobs */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-brand-600/20 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-brand-400/15 rounded-full blur-3xl translate-x-1/2 translate-y-1/2 pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 w-[600px] h-[600px] bg-brand-800/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 pointer-events-none" />

      <div className="w-full max-w-md relative">
        {/* Logo / Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 mb-5 shadow-xl">
            <svg
              className="w-9 h-9 text-white drop-shadow"
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
          <h1 className="text-3xl font-bold text-white tracking-tight">
            Sales Academy
          </h1>
          <p className="text-brand-200 text-sm mt-2 font-medium">
            Elevate your sales performance
          </p>
        </div>

        {/* Auth card */}
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl shadow-2xl overflow-hidden">
          {children}
        </div>

        {/* Footer */}
        <p className="text-center text-brand-300/60 text-xs mt-6">
          © {new Date().getFullYear()} Sales Academy. All rights reserved.
        </p>
      </div>
    </div>
  )
}
