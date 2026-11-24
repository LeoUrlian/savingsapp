# API (NestJS). Contexto de build = RAIZ do repositório:
#   docker build -f apps/api/Dockerfile .
FROM node:22-bookworm-slim AS build
RUN corepack enable && corepack prepare pnpm@9.15.9 --activate
WORKDIR /app

# 1) Só os manifestos: o `install` fica em cache enquanto as dependências não mudam.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/
COPY packages/shared/package.json packages/shared/
RUN pnpm install --frozen-lockfile --filter "@savings/api..."

# 2) Código, cliente do Prisma e build.
COPY packages/shared packages/shared
COPY apps/api apps/api
RUN pnpm --filter @savings/api exec prisma generate \
 && pnpm --filter @savings/api build

# 3) Imagem final: sem ferramentas de build e sem rodar como root.
FROM node:22-bookworm-slim
RUN apt-get update \
 && apt-get install -y --no-install-recommends openssl ca-certificates \
 && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production
WORKDIR /app/apps/api
COPY --from=build --chown=node:node /app /app
USER node
EXPOSE 3333
# Aplica as migrações pendentes e sobe a API.
CMD ["sh", "-c", "./node_modules/.bin/prisma migrate deploy && node dist/main.js"]
