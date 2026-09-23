/** @type {import('next').NextConfig} */
const path = require('node:path');
const dotenv = require('dotenv');

// The workspace keeps the shared local environment file at repository root.
// Next.js resolves .env files relative to apps/web, so load the root file here
// for local monorepo development without committing any credentials.
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

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
