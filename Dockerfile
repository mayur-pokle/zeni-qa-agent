# Multi-stage build to stay under Railway's 4 GB image-size cap.
#
# The single-stage `mcr.microsoft.com/playwright:v1.59.1-jammy` image is
# ~4.2 GB before we add anything. Splitting build vs runtime and pulling
# only the browsers we actually use keeps the final image around 1.5 GB.

# ---------- Stage 1: build ----------
# Full deps + dev deps + source → produces a .next production build and a
# generated Prisma client. Nothing from this stage ships except the built
# output that stage 2 copies.
FROM node:20-slim AS builder

# Prisma warns and falls back to an openssl-1.1.x binary if it can't detect
# the system's OpenSSL. node:20-slim (Debian bookworm) has libssl3 but no
# `openssl` CLI out of the box, so we install it here for correct detection.
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy workspace manifests first so layer caching works on unchanged deps.
COPY package.json package-lock.json ./
COPY backend/package.json backend/package.json
COPY frontend/package.json frontend/package.json

# Install all workspaces with devDependencies so Next.js/TypeScript/Tailwind
# are available at build time. --ignore-scripts skips the backend's
# postinstall (`prisma generate`) which can't run yet — the schema file
# hasn't been copied. We run it explicitly in the build step below.
RUN npm ci --include=dev --ignore-scripts

COPY . .

# Generates Prisma client + Next.js production build for the backend.
RUN npm --workspace backend run build


# ---------- Stage 2: runtime ----------
# Minimal Node image with production deps + Playwright browsers and the
# system libs they need. This is what Railway runs.
FROM node:20-slim

ENV NODE_ENV=production \
    PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

# Same OpenSSL setup as the builder — needed for both `prisma generate` at
# image-build time and `prisma db push` at container start.
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Re-install only production deps for a slim node_modules. We deliberately
# don't copy /app/node_modules from the builder stage because it contains
# devDependencies and would bloat the image.
COPY package.json package-lock.json ./
COPY backend/package.json backend/package.json
COPY frontend/package.json frontend/package.json

RUN npm ci --omit=dev --ignore-scripts

# Copy the built backend from the builder — excluding node_modules (we
# already built a clean production-only one above) and test fixtures.
COPY --from=builder /app/backend/.next ./backend/.next
COPY --from=builder /app/backend/app ./backend/app
COPY --from=builder /app/backend/lib ./backend/lib
COPY --from=builder /app/backend/prisma ./backend/prisma
COPY --from=builder /app/backend/public ./backend/public
COPY --from=builder /app/backend/monitoring ./backend/monitoring
COPY --from=builder /app/backend/alerts ./backend/alerts
COPY --from=builder /app/backend/scripts ./backend/scripts
COPY --from=builder /app/backend/types ./backend/types
COPY --from=builder /app/backend/next.config.ts ./backend/next.config.ts
COPY --from=builder /app/backend/next-env.d.ts ./backend/next-env.d.ts
COPY --from=builder /app/backend/tsconfig.json ./backend/tsconfig.json
COPY --from=builder /app/backend/postcss.config.mjs ./backend/postcss.config.mjs

# Regenerate the Prisma client against the freshly installed production
# node_modules. `db:generate` just runs `prisma generate`.
RUN npm --workspace backend run db:generate

# Install Playwright browsers + their system libs. --with-deps runs apt-get
# for the required libraries (libnss3, libatk, libgbm, libgtk-3, etc.).
# Clean apt caches afterwards to keep the image small.
RUN npx playwright install --with-deps chromium firefox webkit \
  && rm -rf /var/lib/apt/lists/*

EXPOSE 3000

# On boot, sync the schema then start Next.js. Fails fast if DATABASE_URL
# isn't injected.
CMD ["sh", "-c", "if [ -z \"$DATABASE_URL\" ]; then echo '[startup] DATABASE_URL is not set - aborting'; exit 1; fi && npm --workspace backend run db:push && npm --workspace backend run start"]
