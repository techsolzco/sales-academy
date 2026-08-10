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
}

module.exports = nextConfig
