# syntax=docker/dockerfile:1.7

FROM node:20-bookworm-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV NEXT_TELEMETRY_DISABLED=1
RUN corepack enable && corepack prepare pnpm@9.15.9 --activate
WORKDIR /app

FROM base AS pruner
COPY . .
RUN pnpm dlx turbo@2.3.3 prune @simplify-dev/web @simplify-dev/registry-api --docker

FROM base AS deps
COPY --from=pruner /app/out/json/ ./
COPY --from=pruner /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
COPY .npmrc ./
RUN printf 'engine-strict=false\n' >> .npmrc
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

FROM deps AS builder
COPY --from=pruner /app/out/full/ ./
COPY --from=pruner /app/tsconfig.base.json ./tsconfig.base.json
RUN pnpm turbo run build --filter=@simplify-dev/web... --filter=@simplify-dev/registry-api...

FROM base AS dev
COPY --from=deps /app ./
COPY --from=pruner /app/out/full/ ./
EXPOSE 3000
CMD ["pnpm", "--filter", "@simplify-dev/web", "dev"]

FROM node:20-bookworm-slim AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
WORKDIR /app

RUN groupadd --system --gid 1001 nodejs \
  && useradd --system --uid 1001 --gid nodejs nextjs

COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/public ./apps/web/public
COPY --from=builder --chown=nextjs:nodejs /app/apps/registry-api/dist ./apps/registry-api/dist

USER nextjs
EXPOSE 3000

CMD ["node", "apps/web/server.js"]
