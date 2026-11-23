# SavingsApp

Aplicação de **metas de poupança** assistida por dados: você define um objetivo
(ex.: "R$ 20.000 para uma viagem até dez/2026"), registra aportes, e o sistema
mostra **gráficos de progresso, métricas e estimativas** de quando você alcança
a meta. Os valores são exibidos nas moedas mais usadas — **Real, Dólar e Euro** —
com conversão ao vivo.

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

## Roadmap de fatias

Cada fatia roda de ponta a ponta antes de avançar.

- **Fatia 0** ✅ — Monorepo + Next + Nest + contrato TS + health-check. (feito)
- **Fatia 1** (feito) — Domínio: `Goal` (meta) e `Deposit` (aporte). CRUD na API +
  lista/criação no front.
- **Fatia 2** (feito) — Multi-moeda: integrar API de câmbio e exibir metas em BRL/USD/EUR.
- **Fatia 3** (feito) — Gráficos e métricas: progresso da meta, histórico de aportes,
  projeção de quando a meta é alcançada.
- **Fatia 4** — IA: "quanto guardar por mês para bater X até a data Y" + análise
  de ritmo de poupança.
- **Fatia 5** — Auth + segurança (dados financeiros) + PWA + deploy cloud-native.

## Estrutura

```
savingsapp/
├─ apps/
│  ├─ api/        # NestJS — a API é o produto (API-first)
│  └─ web/        # Next.js — dashboard de metas e gráficos
├─ packages/
│  └─ shared/     # tipos TS compartilhados (Goal, Deposit, Currency…)
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
pnpm --filter @savings/api test   # testes da API
```

## Câmbio (Fatia 2)

- `GET /rates?base=BRL` devolve a cotação de 1 unidade da moeda base em BRL, USD e EUR.
- Fonte: [Frankfurter](https://frankfurter.dev) (dados do BCE), sem chave de API.
- Cache em memória de 1 hora. Se a fonte cair, a API usa a última cotação guardada.
- O saldo de uma meta (`savedAmountCents`) converte cada aporte para a moeda da meta pela cotação do dia. Por isso o saldo pode mudar com o câmbio.
- No front, `?moeda=USD` (ou BRL/EUR) escolhe a moeda de exibição.
## Gráficos e métricas (Fatia 3)

- `GET /goals/:id/stats` devolve histórico de saldo, ritmo por mês, aportes por mês, data prevista e situação da meta.
- Aportes em outra moeda são convertidos para a moeda da meta pela cotação do dia.
- Ritmo: total guardado dividido pelos dias desde o primeiro aporte, com janela mínima de 30 dias. A previsão assume esse ritmo constante.
- Situação: "No prazo" ou "Atrasada" só aparece se a meta tem data-alvo.
- Os meses são contados no fuso de Brasília (UTC-3).
- No front, cada meta mostra 4 números, uma linha com o saldo e a projeção, e barras de aportes por mês (últimos 12). Os gráficos são SVG puro, sem biblioteca.
