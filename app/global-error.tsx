'use client'

import { useEffect } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[Global Error]', error)
  }, [error])

  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif', background: '#f9fafb', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', textAlign: 'center', padding: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem', color: '#111' }}>
            Something went wrong
          </h2>
          <p style={{ color: '#6b7280', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
            Please refresh the page � this usually resolves on its own.
          </p>
          <button
            onClick={reset}
            style={{ background: '#2563eb', color: 'white', border: 'none', borderRadius: '0.75rem', padding: '0.625rem 1.25rem', fontWeight: 600, cursor: 'pointer' }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  )
}
