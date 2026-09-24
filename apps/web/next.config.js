/* eslint-disable @typescript-eslint/no-require-imports */
/** @type {import('next').NextConfig} */
const path = require('node:path');
const dotenv = require('dotenv');
const { PHASE_DEVELOPMENT_SERVER } = require('next/constants');

// The workspace keeps the shared local environment file at repository root.
// Next.js resolves .env files relative to apps/web, so load the root file here
// for local monorepo development without committing any credentials.
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

module.exports = (phase) => ({
  // Keep development chunks separate from production builds. Running a build
  // while the local dev server is open must not invalidate its module graph.
  distDir: phase === PHASE_DEVELOPMENT_SERVER ? '.next-dev' : '.next',
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  transpilePackages: ['@pfotennetz/design-system', '@pfotennetz/supabase', '@pfotennetz/shared'],
  experimental: {
    optimizePackageImports: ['@pfotennetz/design-system'],
  },
});
