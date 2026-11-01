# syntax=docker/dockerfile:1

# Build image for the Anthropic OSS Scanner
# (https://github.com/anthropics/oss-scanner#how-to-sign-up).
#
# How the scanner uses this file:
#   1. it clones the repository and builds this Dockerfile with network access,
#   2. it adds its own layer on top of the final stage (Claude Code, compilers,
#      debuggers) using apt-get, then
#   3. it runs the audit inside the image with NO network.
#
# Consequences for this file:
#   * everything the audit needs (dependencies, build output, test runners) has
#     to be installed here, while the network is still available;
#   * the checkout must end up at /src, built in place, so that the audit and
#     the tests it runs work on compiled artifacts, not just sources;
#   * the final stage must stay a normal Debian image with a package manager
#     (no alpine/distroless/scratch) so the scanner's layer can install;
#   * no step may wait for input or run forever: the whole build has 45 minutes.

# Node 22 matches "engines" in package.json (>= 22.13.0). Debian (not slim) ships
# git, python3 and build tools that native modules may need during install.
FROM node:22-bookworm

ENV DEBIAN_FRONTEND=noninteractive \
    CI=1 \
    HUSKY=0 \
    DO_NOT_TRACK=1 \
    TURBO_TELEMETRY_DISABLED=1 \
    NEXT_TELEMETRY_DISABLED=1 \
    COREPACK_ENABLE_DOWNLOAD_PROMPT=0

# git: history for the audit. build-essential/python3: node-gyp fallbacks.
# procps/jq/ripgrep/file/unzip/less: everyday analysis tools; the scanner's own
# layer installs its toolset as well, so these are only conveniences.
RUN apt-get update \
 && apt-get install -y --no-install-recommends \
      ca-certificates \
      git \
      python3 \
      build-essential \
      pkg-config \
      procps \
      jq \
      ripgrep \
      file \
      unzip \
      less \
 && rm -rf /var/lib/apt/lists/*

# Same pnpm version as "packageManager" in package.json.
RUN npm install --global pnpm@9.0.0 && pnpm --version

WORKDIR /src

# Install dependencies before copying the sources so that the (slow) install is
# cached when only source files change. Every workspace manifest must be listed
# here, otherwise pnpm resolves an incomplete workspace.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc turbo.json ./
COPY patches ./patches
COPY apps/web/package.json ./apps/web/
COPY apps/mobile/package.json ./apps/mobile/
COPY packages/design-system/package.json ./packages/design-system/
COPY packages/native/package.json ./packages/native/
COPY packages/shared/package.json ./packages/shared/
COPY packages/supabase/package.json ./packages/supabase/
COPY packages/testing/package.json ./packages/testing/
RUN pnpm install --frozen-lockfile

# The repository, including .git, which the scanner keeps for its analysis.
COPY . /src

# Placeholder Supabase settings, identical to the values CI uses
# (.github/workflows/ci.yml). They are fake: no real credentials belong here.
# The web build inlines NEXT_PUBLIC_* at build time and the Supabase client
# throws when the variables are missing, so they must be present while building
# and while running the tests. There is no Supabase instance in the image.
ENV SUPABASE_URL=http://127.0.0.1:54321 \
    SUPABASE_ANON_KEY=ci-anon-key \
    EXPO_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321 \
    EXPO_PUBLIC_SUPABASE_ANON_KEY=ci-anon-key \
    NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321 \
    NEXT_PUBLIC_SUPABASE_ANON_KEY=ci-anon-key

# Turbo builds @pfotennetz/web (Next.js, output: "standalone"). The Expo app has
# no server build; it is analysed as source and exercised through its unit tests.
RUN pnpm build

# Unit tests run offline (Vitest, everything mocked) and take a few seconds.
# A failure here means the image the scanner gets is broken, so the build stops.
# Remove this line if scanning matters more than green tests.
RUN pnpm test

# The scanner overrides these anyway; they make a plain `docker run` usable.
# The Supabase local stack (Docker-in-Docker) and the Playwright E2E suite are
# deliberately not set up: neither can run in the offline audit container.
ENTRYPOINT []
CMD ["bash"]
