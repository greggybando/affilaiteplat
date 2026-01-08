/** @type {import('next').NextConfig} */
// Build timestamp: 2026-01-08T12:10:00 - force fresh build
const nextConfig = {
  webpack: (config, { isServer }) => {
    // Fix for Supabase module resolution
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      }
    }
    return config
  },
  // Ensure proper module resolution
  experimental: {
    serverComponentsExternalPackages: ['@supabase/supabase-js'],
  },
}

module.exports = nextConfig
