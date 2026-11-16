"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Currency } from "@savings/shared";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333";

export function DepositForm({
  goalId,
  currency,
}: {
  goalId: string;
  currency: Currency;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const value = Number(
      String(new FormData(form).get("amount")).replace(",", "."),
    );
    if (!Number.isFinite(value) || value <= 0) {
      setError("Informe um valor maior que zero.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/goals/${goalId}/deposits`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amountCents: Math.round(value * 100),
          currency,
        }),
      });
      if (!res.ok) throw new Error(`Erro ${res.status}`);
      form.reset();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao guardar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-3 flex flex-wrap items-center gap-2">
      <input
        name="amount"
        required
        inputMode="decimal"
        placeholder={`Aporte em ${currency}`}
        className="w-40 rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
      />
      <button
        type="submit"
        disabled={saving}
        className="rounded-lg bg-green-600 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
      >
        {saving ? "Salvando…" : "Guardar"}
      </button>
      {error && <span className="text-sm text-red-500">{error}</span>}
    </form>
  );
}
