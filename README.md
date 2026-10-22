# Migra

Plataforma de **migração e validação de dados assistida por IA**. Conecta dois
bancos (origem v1, destino v2), você descreve o de-para em linguagem natural, a
IA propõe o SQL de migração + checks de validação, o sistema roda em dry-run,
mostra diffs e só então aplica — gerando o runbook automaticamente.

Projeto de aprendizado full-stack 2026: cada tecnologia entra porque o problema
exige, não por modismo.

## Stack

| Camada | Tecnologia |
|---|---|
| Front | **Next.js 16** (App Router, Server Components, Partial Prerendering) |
| Back | **NestJS 12** (API-first, corporativo) |
| Linguagem | **TypeScript** ponta a ponta (contrato compartilhado em `packages/shared`) |
| Banco | **PostgreSQL 16** (via Docker) |
| Monorepo | **pnpm workspaces** |

A fazer nas próximas fatias: integração de IA, execução transacional com diff,
funções serverless de validação, auth + DevSecOps, deploy cloud-native e PWA.

## Estrutura

```
migra/
├─ apps/
│  ├─ api/        # NestJS — a API é o produto (API-first)
│  └─ web/        # Next.js — cliente do dashboard
├─ packages/
│  └─ shared/     # tipos TS compartilhados (o contrato da API)
└─ docker-compose.yml   # Postgres 16 local
```

## Como rodar (dev)

Pré-requisitos: Node 20+, pnpm 9+, Docker.

```bash
# 1. instalar dependências (na raiz)
pnpm install

# 2. copiar variáveis de ambiente
cp .env.example .env    # no Windows: copy .env.example .env

# 3. subir o Postgres
pnpm db:up

# 4. subir a API (terminal 1)  -> http://localhost:3333/health
pnpm dev:api

# 5. subir o front (terminal 2) -> http://localhost:3000
pnpm dev:web
```

Abra http://localhost:3000: o cartão de status fica **verde** quando o front
conversa com a API — provando o contrato TypeScript ponta a ponta.

## Verificação

```bash
pnpm -r build          # build de todos os pacotes
pnpm --filter @migra/api test   # testes da API
```
