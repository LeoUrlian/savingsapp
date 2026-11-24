"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Goal } from "@savings/shared";
import { parseMoneyToCents } from "../lib/money";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333";

/** Botão "Editar" que abre um formulário com nome, valor-alvo e data-alvo. */
export function EditGoal({ goal }: { goal: Goal }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const cents = parseMoneyToCents(String(data.get("target")));
    if (cents === null) {
      setError("Informe um valor-alvo maior que zero.");
      return;
    }
    const name = String(data.get("name")).trim();
    if (!name) {
      setError("Informe um nome.");
      return;
    }
    const date = String(data.get("targetDate") ?? "");

    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/goals/${goal.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          targetAmountCents: cents,
          // null apaga a data-alvo.
          targetDate: date || null,
        }),
      });
      if (!res.ok) throw new Error(`Erro ${res.status}`);
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  const trigger = (
    <button
      type="button"
      onClick={() => setOpen((v) => !v)}
      className="rounded-md border border-zinc-300 px-2 py-0.5 text-xs text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
    >
      Editar
    </button>
  );

  const input =
    "rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900";

  const form = (
    <form
      onSubmit={onSubmit}
      className="absolute right-0 top-full z-20 mt-2 flex w-[min(30rem,85vw)] flex-wrap items-end gap-3 rounded-lg border border-zinc-300 bg-white p-3 text-zinc-900 shadow-lg dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
    >
      <label className="flex flex-col gap-1 text-sm">
        Nome
        <input
          name="name"
          required
          maxLength={120}
          defaultValue={goal.name}
          className={input}
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Valor-alvo ({goal.baseCurrency})
        <input
          name="target"
          required
          inputMode="decimal"
          defaultValue={(goal.targetAmountCents / 100).toFixed(2)}
          className={input}
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Data-alvo
        <input
          name="targetDate"
          type="date"
          defaultValue={goal.targetDate?.slice(0, 10) ?? ""}
          className={input}
        />
      </label>
      <button
        type="submit"
        disabled={saving}
        className="rounded-lg bg-green-600 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
      >
        {saving ? "Salvando…" : "Salvar"}
      </button>
      <button
        type="button"
        onClick={() => {
          setOpen(false);
          setError(null);
        }}
        className="text-sm text-zinc-500 hover:underline dark:text-zinc-400"
      >
        Cancelar
      </button>
      {error && <p className="w-full text-sm text-red-500">{error}</p>}
    </form>
  );

  return (
    <div className="relative inline-block">
      {trigger}
      {open && form}
    </div>
  );
}
