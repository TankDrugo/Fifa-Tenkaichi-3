# syntax=docker/dockerfile:1
# Built from the repository root (infra/docker-compose.yml: context ..).
#
# The build stage runs on the machine that builds (BUILDPLATFORM). Next.js writes a standalone
# server with no native code (sharp is left out in next.config.ts), so the final stage only copies
# it and the arm64 image for Oracle builds on an amd64 PC without emulation.
FROM --platform=$BUILDPLATFORM node:24.22.0-alpine3.24 AS build
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0 NEXT_TELEMETRY_DISABLED=1
RUN corepack enable
WORKDIR /repo
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/shared/package.json packages/shared/
COPY apps/web/package.json apps/web/
RUN pnpm install --frozen-lockfile --filter "@ft3/web..."
COPY tsconfig.base.json ./
COPY packages/shared packages/shared
COPY apps/web apps/web
RUN pnpm --filter @ft3/web build

FROM node:24.22.0-alpine3.24
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
WORKDIR /app
COPY --from=build /repo/apps/web/.next/standalone ./
COPY --from=build /repo/apps/web/.next/static ./apps/web/.next/static
USER node
EXPOSE 3000
HEALTHCHECK --interval=5s --timeout=3s --start-period=10s --retries=5 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:3000/api/health').then(r => process.exit(r.ok ? 0 : 1), () => process.exit(1))"]
CMD ["node", "apps/web/server.js"]
