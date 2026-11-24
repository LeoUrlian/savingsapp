---
inclusion: always
---
# Estrutura e padrões

```
apps/api/src      módulos NestJS (controller, service, dto por domínio)
apps/api/prisma   schema e migrations
apps/api/test     testes e2e
apps/web/src      rotas App Router, componentes
packages/shared   tipos e schemas compartilhados
```

- Um módulo NestJS por domínio (goals, deposits, currency).
- Validar toda entrada nos DTOs. Nunca confiar no cliente.
- Server Components por padrão no web; `"use client"` só quando necessário.
- Antes de mexer no Next.js, ler `apps/web/AGENTS.md`.
- Commits pequenos, mensagens em português ou inglês, no imperativo.
