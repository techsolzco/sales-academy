/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'musnmhafbxxvnhjchyta.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },

  // Security headers (S15). CSP notes — 'unsafe-inline' is kept in two
  // places, deliberately, because the app needs it today:
  //   - script-src 'unsafe-inline': Next.js emits inline bootstrap scripts
  //     (without a nonce-based CSP, which needs middleware support, a
  //     strict script-src breaks hydration). A nonce-based CSP is the
  //     follow-up if script-src is to be tightened.
  //   - style-src 'unsafe-inline': components/layout/ThemeInjector.tsx
  //     injects a <style> block via dangerouslySetInnerHTML, many components
  //     use inline style={{...}} attributes, and next/font loads a Google
  //     Fonts stylesheet.
  // frame-src allows the embeds the app actually uses: Jitsi meeting iframes
  // (meet.jit.si) and YouTube tutorial embeds. img-src allows https: so
  // Supabase-storage and user-supplied image URLs keep working.
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline'",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "img-src 'self' data: blob: https:",
              "font-src 'self' https://fonts.gstatic.com data:",
              "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
              "frame-src 'self' https://meet.jit.si https://www.youtube.com https://youtube.com",
              "media-src 'self' blob: data:",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "frame-ancestors 'self'",
            ].join('; '),
          },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ]
  },
}

module.exports = nextConfig
