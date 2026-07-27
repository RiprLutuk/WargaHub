# syntax=docker/dockerfile:1.7
FROM oven/bun:1.3.12-alpine AS dependencies
WORKDIR /app

COPY package.json bun.lock tsconfig.base.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/contracts/package.json packages/contracts/package.json
RUN bun install --frozen-lockfile

FROM dependencies AS build
COPY apps/api/tsconfig.json apps/api/tsconfig.build.json apps/api/
COPY apps/api/src apps/api/src
COPY packages/contracts/tsconfig.json packages/contracts/tsconfig.json
COPY packages/contracts/src packages/contracts/src
RUN bun run --cwd packages/contracts build \
  && bun run --cwd apps/api build

FROM oven/bun:1.3.12-alpine AS production-dependencies
WORKDIR /app
COPY package.json bun.lock ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/contracts/package.json packages/contracts/package.json
RUN bun install --frozen-lockfile --production

FROM oven/bun:1.3.12-alpine AS runtime
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3000 \
    UPLOAD_DIR=/app/uploads
WORKDIR /app

COPY --from=production-dependencies /app/node_modules ./node_modules
COPY --from=production-dependencies /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=production-dependencies /app/packages/contracts/node_modules ./packages/contracts/node_modules
COPY --chown=bun:bun apps/api/package.json apps/api/package.json
COPY --chown=bun:bun packages/contracts/package.json packages/contracts/package.json
COPY --chown=bun:bun packages/contracts/src packages/contracts/src
COPY --from=build --chown=bun:bun /app/apps/api/dist apps/api/dist
COPY --from=build --chown=bun:bun /app/apps/api/src/db/migrations apps/api/dist/db/migrations
RUN mkdir -p /app/uploads && chown bun:bun /app/uploads

USER bun
EXPOSE 3000
CMD ["bun", "apps/api/dist/server.js"]

