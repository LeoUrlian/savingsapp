import Link from "next/link";
import type { Currency } from "@savings/shared";
import { GoalsList } from "./goals-list";

const OPTIONS: { value: Currency | undefined; label: string }[] = [
  { value: undefined, label: "Original" },
  { value: "BRL", label: "BRL" },
  { value: "USD", label: "USD" },
  { value: "EUR", label: "EUR" },
];

function parseCurrency(value: string | undefined): Currency | undefined {
  return value === "BRL" || value === "USD" || value === "EUR"
    ? value
    : undefined;
}

/**
 * Seletor de moeda + lista de metas. A moeda vive na URL (?moeda=USD),
 * então o seletor é só links e a escolha sobrevive a recarregar a página.
 * Lê searchParams (dado de runtime): usar dentro de <Suspense>.
 */
export async function GoalsSection({
  searchParams,
}: {
  searchParams: Promise<{ moeda?: string }>;
}) {
  const display = parseCurrency((await searchParams).moeda);

  return (
    <>
      <nav aria-label="Moeda de exibição" className="flex items-center gap-2">
        <span className="text-sm text-zinc-500 dark:text-zinc-400">
          Mostrar em:
        </span>
        {OPTIONS.map((o) => {
          const active = o.value === display;
          return (
            <Link
              key={o.label}
              href={o.value ? `/?moeda=${o.value}` : "/"}
              aria-current={active ? "true" : undefined}
              className={`rounded-full border px-3 py-1 text-sm ${
                active
                  ? "border-green-600 bg-green-600 text-white"
                  : "border-zinc-300 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
              }`}
            >
              {o.label}
            </Link>
          );
        })}
      </nav>
      <GoalsList display={display} />
    </>
  );
}
