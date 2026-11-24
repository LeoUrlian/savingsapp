"use client";

import { useState } from "react";
import type { GoalAdvice } from "@savings/shared";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333";

/** Pede à API uma análise em texto da meta e mostra a resposta. */
export function AdviceButton({ goalId }: { goalId: string }) {
  const [loading, setLoading] = useState(false);
  const [advice, setAdvice] = useState<GoalAdvice | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onClick() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/goals/${goalId}/advice`, {
        method: "POST",
        credentials: "include",
      });
      if (res.status === 503) {
        throw new Error(
          "IA não configurada. Defina OPENAI_API_KEY e AI_MODEL no .env da API.",
        );
      }
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as {
          message?: string;
        } | null;
        throw new Error(
          body?.message ?? `A IA não respondeu (erro ${res.status}).`,
        );
      }
      setAdvice((await res.json()) as GoalAdvice);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao pedir análise.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={onClick}
        disabled={loading}
        className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
      >
        {loading ? "Analisando…" : "Pedir análise da IA"}
      </button>
      {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
      {advice && (
        <div className="mt-2 rounded-lg bg-zinc-100 p-3 text-sm dark:bg-zinc-800">
          <p>{advice.text}</p>
          <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
            Gerado por IA ({advice.model}). Só os números da meta foram
            enviados. Não é aconselhamento financeiro.
          </p>
        </div>
      )}
    </div>
  );
}
