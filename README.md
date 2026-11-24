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
- **Fatia 4** (feito) — IA: "quanto guardar por mês para bater X até a data Y" + análise
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
## IA (Fatia 4)

- **Quanto guardar por mês** é uma conta, sem IA: o que falta dividido pelos meses até a data-alvo (mínimo de 1 mês). Aparece em `GET /goals/:id/stats` e na tela como "Guardar por mês".
- `POST /goals/:id/advice` pede à IA uma análise curta da meta (até 120 palavras). O botão fica em cada meta: "Pedir análise da IA".
- A IA recebe só números já formatados. Nome da meta, ids e datas dos aportes não saem do servidor. A chave fica na API e nunca vai para o front.
- Cada clique pode gastar crédito do provedor. Sem a configuração abaixo, a rota responde 503 e o resto do app funciona.
- A IA não recomenda investimentos. Ela só explica os números. Não é aconselhamento financeiro.

Configuração no `.env` (copie também para `apps/api/.env`). Serve qualquer provedor com API no formato da OpenAI, inclusive os com plano grátis:

```
OPENAI_API_KEY=sua-chave
AI_MODEL=id-do-modelo
# opcional; o padrão é a OpenAI. Exemplo com o Groq:
AI_BASE_URL=https://api.groq.com/openai/v1
```

Para listar os modelos da sua conta no Groq: `GET https://api.groq.com/openai/v1/models`. Use um modelo de chat (evite `whisper`, `tts` e `guard`).

Também nesta fatia: botão **Editar** em cada meta (nome, valor-alvo e data-alvo).

## Login e segurança (Fatia 5)

- **Contas:** `POST /auth/register`, `POST /auth/login`, `POST /auth/logout` e `GET /auth/me`. No front, as telas são `/login` e `/cadastro`.
- **Senha:** só o hash é guardado (scrypt, com sal). Mínimo de 8 caracteres.
- **Sessão:** cookie `session` com `httpOnly` e `SameSite=Lax`, válido por 7 dias. Em produção também `Secure` (só HTTPS). No banco fica só o SHA-256 do token, então um vazamento do banco não entrega sessões válidas. Sair apaga a sessão no servidor.
- **Cada pessoa vê só as suas metas.** Meta, aporte, métricas e IA checam o dono. Meta de outra pessoa responde 404.
- **Tudo exige login**, menos `/health`, `/auth/register` e `/auth/login`.
- **Tentativas de login:** 5 falhas em 15 minutos para o mesmo IP e e-mail dão erro 429. O limite fica na memória da API (zera ao reiniciar e não vale entre várias réplicas).
- **CORS:** só a origem do front, com cookie. Padrão `http://localhost:3000`; em produção defina `WEB_ORIGIN`.
- **Metas antigas:** as criadas antes do login não têm dono. A **primeira conta** criada herda todas. Crie a sua antes de qualquer outra.
- No Insomnia, faça `POST /auth/login` primeiro. Ele guarda o cookie e o envia nas outras chamadas.

Ainda não tem: recuperar senha, confirmar e-mail, 2 fatores.

## PWA (Fatia 5)

O app pode ser instalado (no Chrome: ícone de instalar na barra de endereço; no celular: "Adicionar à tela inicial").

- `apps/web/src/app/manifest.ts`: nome, cores e ícones.
- `apps/web/public/icons/`: ícones PNG 192 e 512, gerados por `node apps/web/scripts/make-icons.mjs` (sem dependências).
- `apps/web/public/sw.js`: service worker **mínimo**. Só mostra `offline.html` ("Sem conexão") quando a rede cai ao abrir uma tela.
- O service worker **não guarda** páginas nem respostas da API. São dados financeiros de uma conta logada, e um cache poderia mostrar o saldo de uma pessoa a outra no mesmo aparelho. Por isso o app **não funciona offline**; só avisa.
- O service worker só é registrado em produção (`pnpm --filter @savings/web build` e `start`). Em `dev` ele fica desligado.
- O PWA instalável exige HTTPS. `localhost` é aceito como exceção.

## Deploy (Fatia 5)

Tudo roda em contêineres Docker, em uma única máquina (um VPS ou o seu PC). Não depende de nenhum provedor de nuvem.

```
Internet --> Caddy (80/443, HTTPS automático)
               |-- /api/*  --> API (NestJS)  --> Postgres
               `-- resto   --> Front (Next.js)
```

Front e API ficam no **mesmo endereço**. Por isso o cookie de sessão é do mesmo site e não precisa de CORS. O Caddy remove o prefixo `/api` antes de chamar a API.

**Passos:**

1. Copie `.env.prod.example` para `.env.prod` e preencha `DOMAIN` e `POSTGRES_PASSWORD`. Para testar no seu PC, deixe `DOMAIN=localhost`.
2. Suba tudo:
   ```
   docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build
   ```
3. Abra `https://localhost` (no PC, o navegador avisa do certificado local: aceite) ou `https://seu-dominio`.

**O que acontece sozinho:** a API aplica as migrações do banco ao ligar. Com um domínio real apontado para a máquina, o Caddy pega e renova o certificado.

**Arquivos:** `apps/api/Dockerfile`, `apps/web/Dockerfile`, `docker-compose.prod.yml`, `deploy/Caddyfile`, `.env.prod.example`.

**Cuidados:**
- Só o Caddy abre portas (80 e 443). O banco e a API ficam na rede interna do Docker.
- O `.env.prod` guarda segredos e não vai para o git.
- Faça backup do volume do banco (`savings_pgdata`). Sem backup, apagar o volume apaga os dados.
- O endereço da API que o navegador usa é gravado no build do front (`NEXT_PUBLIC_API_URL`). Se mudar o domínio, refaça o build.
- O limite de tentativas de login fica na memória de uma única API. Com várias réplicas, mova-o para um serviço compartilhado.
- O compose de produção tem nome de projeto próprio (`savingsapp-prod`), para não misturar com o banco de desenvolvimento.

## Deploy grátis: Vercel + Render + Neon

```
Navegador --> Vercel (front)  --/api/*-->  Render (API)  -->  Neon (Postgres)
```

O front chama `/api/...` no próprio endereço da Vercel, e a Vercel repassa para o Render. Assim o cookie de sessão fica no mesmo site.

**Limites dos planos grátis** (confira nos sites, eles mudam):
- **Render:** o serviço grátis "dorme" após 15 minutos sem uso. O primeiro acesso depois disso leva cerca de 50 segundos. Dá 750 horas por mês, o que cobre um serviço ligado o mês inteiro.
- **Neon:** 1 GB por projeto, sem prazo e sem cartão. O banco "dorme" após 5 minutos e acorda em milissegundos.
- **Vercel Hobby:** só para uso pessoal e **não comercial**.

**Passos**

1. **Banco (Neon).** Crie um projeto em [neon.com](https://neon.com). Copie a connection string **direta** (sem "pooler") e guarde: é o `DATABASE_URL`.
2. **API (Render).** Suba o projeto para um repositório no GitHub. No [render.com](https://render.com), crie um **Web Service** a partir dele:
   - Runtime: **Docker**. Dockerfile: `apps/api/Dockerfile`. Contexto: a raiz (`.`).
   - Plano: **Free**. Health Check Path: `/health`.
   - Variáveis: `DATABASE_URL`, `NODE_ENV=production`, `TRUST_PROXY=true` e, se usar a IA, `OPENAI_API_KEY`, `AI_MODEL`, `AI_BASE_URL`.
   - A API aplica as migrações do banco sozinha ao ligar. Anote o endereço, por exemplo `https://savings-api.onrender.com`.
3. **Front (Vercel).** No [vercel.com](https://vercel.com), importe o mesmo repositório:
   - Root Directory: `apps/web`, com a opção de incluir arquivos de fora dessa pasta ligada.
   - Variáveis (as duas primeiras valem para o build):
     - `NEXT_PUBLIC_API_URL=/api`
     - `API_PROXY_URL=https://savings-api.onrender.com`
     - `API_INTERNAL_URL=https://savings-api.onrender.com`
4. Abra o endereço da Vercel e crie a sua conta.

**Para a API não dormir:** crie um aviso grátis em [cron-job.org](https://cron-job.org) que abra `https://savings-api.onrender.com/health` a cada 10 minutos.

**Cuidados**
- Os dados do seu PC não vão sozinhos. Faça um `pg_dump` aqui e restaure no Neon.
- Atrás de dois proxies (Vercel e Render), o limite de login enxerga o IP do proxy. Na prática ele limita por e-mail, não por pessoa.
- O `.env` e as chaves ficam só nos painéis da Vercel e do Render. Nunca no git.
