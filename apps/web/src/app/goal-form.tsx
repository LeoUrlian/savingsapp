"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Currency } from "@savings/shared";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333";

export function GoalForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    const target = Number(String(data.get("target")).replace(",", "."));
    if (!Number.isFinite(target) || target <= 0) {
      setError("Informe um valor-alvo maior que zero.");
      return;
    }
    const targetDate = String(data.get("targetDate") ?? "");

    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/goals`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: String(data.get("name")).trim(),
          targetAmountCents: Math.round(target * 100),
          baseCurrency: data.get("currency") as Currency,
          ...(targetDate ? { targetDate } : {}),
        }),
      });
      if (!res.ok) throw new Error(`Erro ${res.status}`);
      form.reset();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao criar a meta.");
    } finally {
      setSaving(false);
    }
  }

  const input =
    "rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900";

  return (
    <form onSubmit={onSubmit} className="flex flex-wrap items-end gap-3">
      <label className="flex flex-col gap-1 text-sm">
        Nome
        <input name="name" required maxLength={120} className={input} />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Valor-alvo
        <input
          name="target"
          required
          inputMode="decimal"
          placeholder="20000"
          className={input}
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Moeda
        <select name="currency" defaultValue="BRL" className={input}>
          <option value="BRL">BRL</option>
          <option value="USD">USD</option>
          <option value="EUR">EUR</option>
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Data-alvo
        <input name="targetDate" type="date" className={input} />
      </label>
      <button
        type="submit"
        disabled={saving}
        className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {saving ? "Salvando…" : "Criar meta"}
      </button>
      {error && <p className="w-full text-sm text-red-500">{error}</p>}
    </form>
  );
}
