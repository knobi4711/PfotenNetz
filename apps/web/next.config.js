/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  transpilePackages: ['@pfotennetz/design-system', '@pfotennetz/supabase', '@pfotennetz/shared'],
  experimental: {
    optimizePackageImports: ['@pfotennetz/design-system'],
  },
};

module.exports = nextConfig;
