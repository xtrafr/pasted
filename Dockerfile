# syntax=docker/dockerfile:1.7

FROM node:24-bookworm-slim AS base

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH

RUN corepack enable
WORKDIR /app

FROM base AS dependencies

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
	pnpm install --frozen-lockfile --ignore-scripts

FROM dependencies AS build

COPY . .
RUN pnpm rebuild esbuild @tailwindcss/oxide \
	&& pnpm prepare \
	&& pnpm build

FROM base AS production-dependencies

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
	pnpm install --prod --frozen-lockfile --ignore-scripts \
	&& pnpm rebuild esbuild

FROM dependencies AS migrate

ENV NODE_ENV=production

COPY drizzle ./drizzle
COPY drizzle.config.ts ./
COPY scripts ./scripts
COPY src/lib/server/db ./src/lib/server/db
RUN pnpm rebuild esbuild

USER node
CMD ["pnpm", "db:migrate"]

FROM base AS worker

ENV NODE_ENV=production

COPY --from=production-dependencies --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/src ./src
COPY --from=build --chown=node:node /app/.svelte-kit/tsconfig.json ./.svelte-kit/tsconfig.json
COPY --from=build --chown=node:node /app/tsconfig.json ./
COPY --chown=node:node package.json ./

USER node

HEALTHCHECK --interval=30s --timeout=8s --start-period=45s --retries=3 \
	CMD ["node", "-e", "import('pg').then(async ({ default: pg }) => { const client = new pg.Client({ connectionString: process.env.DATABASE_URL }); try { await client.connect(); const result = await client.query(\"select 1 from worker_heartbeats where worker_id = $1 and process_type = 'metadata' and metadata->>'status' = 'running' and last_seen_at > now() - interval '90 seconds'\", [process.env.WORKER_ID ?? 'metadata-worker-1']); if (result.rowCount !== 1) process.exitCode = 1; } finally { await client.end(); } }).catch(() => process.exit(1))"]

CMD ["pnpm", "worker"]

FROM base AS runner

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000

COPY --from=production-dependencies --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/build ./build
COPY --chown=node:node package.json ./

USER node
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
	CMD ["node", "-e", "fetch('http://127.0.0.1:3000/api/health').then((response) => { if (!response.ok) process.exit(1) }).catch(() => process.exit(1))"]

CMD ["node", "build"]
