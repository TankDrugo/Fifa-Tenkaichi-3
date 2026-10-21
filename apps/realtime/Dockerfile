# syntax=docker/dockerfile:1
# Built from the repository root (infra/docker-compose.yml: context ..).
#
# The build stage runs on the machine that builds (BUILDPLATFORM) and makes one JavaScript file
# with no native code; the final stage only copies it, so the arm64 image for Oracle builds on an
# amd64 PC without emulation.
FROM --platform=$BUILDPLATFORM node:24.22.1-alpine3.24 AS build
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable
WORKDIR /repo
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/shared/package.json packages/shared/
COPY apps/realtime/package.json apps/realtime/
RUN pnpm install --frozen-lockfile --filter "@ft3/realtime..."
COPY tsconfig.base.json ./
COPY packages/shared packages/shared
COPY apps/realtime apps/realtime
RUN pnpm --filter @ft3/realtime build

FROM node:24.22.1-alpine3.24
ENV NODE_ENV=production PORT=3001
WORKDIR /app
COPY --from=build /repo/apps/realtime/dist/server.mjs ./server.mjs
USER node
EXPOSE 3001
HEALTHCHECK --interval=5s --timeout=3s --start-period=5s --retries=5 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:3001/health').then(r => process.exit(r.ok ? 0 : 1), () => process.exit(1))"]
CMD ["node", "server.mjs"]
