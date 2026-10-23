# syntax=docker/dockerfile:1

FROM node:22-alpine AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

# Install dependencies in a separate layer so they remain cached until the
# package manifests change.
FROM base AS dependencies
RUN apk add --no-cache libc6-compat
COPY package.json package-lock.json ./
RUN npm ci

# Build the application. NEXT_PUBLIC_* values are embedded in the browser
# bundle by Next.js, so provide them with --build-arg when building the image.
FROM base AS builder
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .

ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
ARG NEXT_PUBLIC_SITE_URL=http://localhost:3000
ARG NEXT_PUBLIC_LIVEKIT_URL
ARG NEXT_PUBLIC_AI_MODEL=gemini-2.5-flash-lite

ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL \
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=$NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY \
    NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL \
    NEXT_PUBLIC_LIVEKIT_URL=$NEXT_PUBLIC_LIVEKIT_URL \
    NEXT_PUBLIC_AI_MODEL=$NEXT_PUBLIC_AI_MODEL

# These values are compiled into the client bundle. Fail before the expensive
# Next.js build if they were not supplied with --build-arg.
RUN if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ]; then \
      echo >&2 "ERROR: NEXT_PUBLIC_SUPABASE_URL build argument is required"; exit 1; \
    fi; \
    if [ -z "$NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY" ]; then \
      echo >&2 "ERROR: NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY build argument is required"; exit 1; \
    fi; \
    npm run build

# The standalone output contains only the files required at runtime.
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0 \
    PORT=3000

COPY --from=builder --chown=node:node /app/public ./public
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static

USER node
EXPOSE 3000

CMD ["node", "server.js"]
