import { Suspense } from "react";
import type { HealthResponse } from "@migra/shared";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333";

async function getHealth(): Promise<HealthResponse | null> {
  try {
    const res = await fetch(`${API_URL}/health`, { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as HealthResponse;
  } catch {
    return null;
  }
}

/**
 * Componente que ACESSA dados de runtime (fetch à API).
 * No Next 16 (Cache Components), acesso a dados dinâmicos precisa ficar
 * dentro de <Suspense> — é o que permite o streaming: a casca da página
 * renderiza na hora e este pedaço chega quando a API responde.
 */
async function ApiStatus() {
  const health = await getHealth();
  const online = health?.status === "ok";

  return (
    <div className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white px-5 py-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <span
        className={`inline-block h-3 w-3 rounded-full ${
          online ? "bg-green-500" : "bg-red-500"
        }`}
        aria-hidden
      />
      <div className="text-sm">
        <p className="font-medium">API: {online ? "online" : "offline"}</p>
        {health ? (
          <p className="text-zinc-500 dark:text-zinc-400">
            {health.service} ·{" "}
            {new Date(health.timestamp).toLocaleString("pt-BR")}
          </p>
        ) : (
          <p className="text-zinc-500 dark:text-zinc-400">
            Rode a API com <code className="font-mono">pnpm dev:api</code>
          </p>
        )}
      </div>
    </div>
  );
}

function ApiStatusFallback() {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white px-5 py-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <span className="inline-block h-3 w-3 animate-pulse rounded-full bg-zinc-400" />
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        Verificando a API…
      </p>
    </div>
  );
}

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-zinc-50 p-8 font-sans text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-4xl font-bold tracking-tight">Migra</h1>
        <p className="max-w-md text-zinc-600 dark:text-zinc-400">
          Plataforma de migração e validação de dados assistida por IA.
        </p>
      </div>

      <Suspense fallback={<ApiStatusFallback />}>
        <ApiStatus />
      </Suspense>

      <p className="text-xs text-zinc-400 dark:text-zinc-600">
        Fatia 0 · monorepo Next + Nest + TypeScript ponta a ponta
      </p>
    </div>
  );
}
