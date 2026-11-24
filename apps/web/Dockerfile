# Front (Next.js). Contexto de build = RAIZ do repositório:
#   docker build -f apps/web/Dockerfile --build-arg NEXT_PUBLIC_API_URL=https://seu-dominio/api .
FROM node:22-bookworm-slim AS build
RUN corepack enable && corepack prepare pnpm@9.15.9 --activate
WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json apps/web/
COPY packages/shared/package.json packages/shared/
RUN pnpm install --frozen-lockfile --filter "@savings/web..."

COPY packages/shared packages/shared
COPY apps/web apps/web

# O endereço da API que o NAVEGADOR usa é gravado no código na hora do build.
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_TELEMETRY_DISABLED=1
ENV BUILD_STANDALONE=true
RUN pnpm --filter @savings/web build

FROM node:22-bookworm-slim
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0 \
    PORT=3000
WORKDIR /app
# "standalone": só os arquivos que o servidor realmente usa.
COPY --from=build --chown=node:node /app/apps/web/.next/standalone ./
COPY --from=build --chown=node:node /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=build --chown=node:node /app/apps/web/public ./apps/web/public
USER node
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
