import type { Deposit } from "@savings/shared";
import { formatMoney } from "../lib/money";
import { DeleteButton } from "./delete-button";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333";

async function getDeposits(goalId: string): Promise<Deposit[] | null> {
  try {
    const res = await fetch(`${API_URL}/goals/${goalId}/deposits`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as Deposit[];
  } catch {
    return null;
  }
}

/** Aportes de uma meta, do mais novo ao mais antigo. Usar dentro de <Suspense>. */
export async function DepositsList({ goalId }: { goalId: string }) {
  const deposits = await getDeposits(goalId);

  if (deposits === null) {
    return <p className="mt-3 text-sm text-red-500">Erro ao carregar aportes.</p>;
  }
  if (deposits.length === 0) {
    return (
      <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">
        Nenhum aporte ainda.
      </p>
    );
  }

  return (
    <ul className="mt-3 divide-y divide-zinc-200 text-sm dark:divide-zinc-800">
      {deposits.map((d) => (
        <li key={d.id} className="flex justify-between py-1.5">
          <span className="text-zinc-500 dark:text-zinc-400">
            {new Date(d.createdAt).toLocaleDateString("pt-BR")}
          </span>
          <span>{formatMoney(d.amountCents, d.currency)}</span>
          <DeleteButton
            path={`/goals/${goalId}/deposits/${d.id}`}
            label="Apagar"
            confirmText="Apagar este aporte?"
          />
        </li>
      ))}
    </ul>
  );
}
