import type { Currency, Goal } from "@savings/shared";
import { Suspense } from "react";
import { formatMoney } from "../lib/money";
import { DepositForm } from "./deposit-form";
import { DepositsList } from "./deposits-list";
import { DeleteButton } from "./delete-button";
import { ConvertedAmount } from "./converted-amount";
import { GoalStatsPanel } from "./goal-stats";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333";

async function getGoals(): Promise<Goal[] | null> {
  try {
    const res = await fetch(`${API_URL}/goals`, { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as Goal[];
  } catch {
    return null;
  }
}

/** Lista de metas. Acessa dados de runtime: usar dentro de <Suspense>. */
export async function GoalsList({ display }: { display?: Currency }) {
  const goals = await getGoals();

  if (goals === null) {
    return (
      <p className="text-sm text-red-500">
        Não foi possível carregar as metas. A API está rodando?
      </p>
    );
  }

  if (goals.length === 0) {
    return (
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        Nenhuma meta ainda. Crie a primeira acima.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {goals.map((goal) => {
        const pct = Math.min(
          100,
          Math.round((goal.savedAmountCents / goal.targetAmountCents) * 100),
        );
        return (
          <li
            key={goal.id}
            className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
          >
            <div className="flex items-baseline justify-between gap-4">
              <h3 className="font-medium">{goal.name}</h3>
              <span className="flex items-center gap-3 text-sm text-zinc-500 dark:text-zinc-400">
                {pct}%
                <DeleteButton
                  path={`/goals/${goal.id}`}
                  label="Apagar meta"
                  confirmText={`Apagar a meta "${goal.name}" e todos os aportes?`}
                />
              </span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
              <div
                className="h-full bg-green-500"
                style={{ width: `${pct}%` }}
              />
            </div>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              {formatMoney(goal.savedAmountCents, goal.baseCurrency)} de{" "}
              {formatMoney(goal.targetAmountCents, goal.baseCurrency)}
              {goal.targetDate
                ? ` · até ${new Date(goal.targetDate).toLocaleDateString("pt-BR")}`
                : ""}
            </p>
            <Suspense fallback={null}>
              <ConvertedAmount
                savedCents={goal.savedAmountCents}
                targetCents={goal.targetAmountCents}
                base={goal.baseCurrency}
                targets={
                  display
                    ? [display].filter((c) => c !== goal.baseCurrency)
                    : undefined
                }
              />
            </Suspense>
            <Suspense fallback={null}>
              <GoalStatsPanel goalId={goal.id} />
            </Suspense>
            <DepositForm goalId={goal.id} currency={goal.baseCurrency} />
            <Suspense
              fallback={<p className="mt-3 text-sm text-zinc-500">Carregando…</p>}
            >
              <DepositsList goalId={goal.id} />
            </Suspense>
          </li>
        );
      })}
    </ul>
  );
}
