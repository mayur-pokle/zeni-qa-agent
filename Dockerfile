# Playwright's official image ships with Node 20 and all three browsers
# (chromium, firefox, webkit) plus every system library they need. Railway's
# Nixpacks image does not, so building the QA worker on top of Playwright's
# base avoids a long list of apt/nix setup steps.
#
# Version pinned to match the Playwright version resolved in package-lock.json
# (both `playwright` and `@playwright/test` resolve to 1.59.1). If the lock
# file's version changes, bump this tag to match — mismatched major/minor
# versions cause "Executable doesn't exist" errors at runtime.
FROM mcr.microsoft.com/playwright:v1.59.1-jammy

ENV NODE_ENV=production

WORKDIR /app

# Copy workspace manifests first so install layers cache when deps haven't
# changed. Using the lockfile guarantees deterministic installs.
COPY package.json package-lock.json ./
COPY backend/package.json backend/package.json
COPY frontend/package.json frontend/package.json

# Install all workspaces. --include=dev is required because the Next.js
# production build uses TypeScript, Tailwind, and Prisma generate.
# --ignore-scripts skips the backend's `postinstall: prisma generate` at
# this stage because the schema.prisma file hasn't been copied yet. The
# build step below runs `prisma generate` explicitly once the source is
# available.
RUN npm ci --include=dev --ignore-scripts

# Copy the rest of the source tree (respects .dockerignore).
COPY . .

# Prisma client generation + Next.js production build for the backend.
RUN npm --workspace backend run build

# Railway sets PORT at runtime; `next start` reads it automatically.
EXPOSE 3000

# On boot, sync the database schema then hand off to Next. Fails fast if
# DATABASE_URL is not injected so we don't accidentally write a fresh
# schema to the wrong place.
CMD ["sh", "-c", "if [ -z \"$DATABASE_URL\" ]; then echo '[startup] DATABASE_URL is not set - aborting'; exit 1; fi && npm --workspace backend run db:push && npm --workspace backend run start"]
