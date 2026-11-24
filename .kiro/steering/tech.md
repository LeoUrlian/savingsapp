---
inclusion: always
---
# Stack e comandos

- Monorepo pnpm: `apps/api` (NestJS + Prisma + PostgreSQL), `apps/web` (Next.js App Router), `packages/shared` (contratos TS).
- Node >= 20, pnpm 9. TypeScript estrito ponta a ponta.
- Contratos de API vivem em `packages/shared`; web e api importam de lá. Não duplicar tipos.
- API documentada em `apps/api/openapi.yaml`: atualizar ao mudar endpoints.
- Testes da API: Vitest (unit e e2e). Lint: oxlint (api) e eslint (web).

Comandos:
- `pnpm db:up` / `pnpm db:down` — Postgres via Docker
- `pnpm dev:api` / `pnpm dev:web`
- `pnpm build` / `pnpm lint`
