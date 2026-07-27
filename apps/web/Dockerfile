# syntax=docker/dockerfile:1.7
FROM oven/bun:1.3.12-alpine AS dependencies
WORKDIR /app

COPY package.json bun.lock tsconfig.base.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/contracts/package.json packages/contracts/package.json
RUN bun install --frozen-lockfile

FROM dependencies AS build
ARG VITE_API_BASE_URL=""
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
COPY apps/web apps/web
COPY packages/contracts/tsconfig.json packages/contracts/tsconfig.json
COPY packages/contracts/src packages/contracts/src
RUN bun run --cwd apps/web build

FROM caddy:2.10.2-alpine AS runtime
COPY infra/caddy/web.Caddyfile /etc/caddy/Caddyfile
COPY --from=build --chown=caddy:caddy /app/apps/web/dist /srv
USER caddy
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8080/ >/dev/null || exit 1

