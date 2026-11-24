import type { Currency, ExchangeRates } from "@savings/shared";
import { apiFetch } from "../lib/api";
import { formatMoney } from "../lib/money";

const ALL: Currency[] = ["BRL", "USD", "EUR"];

async function getRates(base: Currency): Promise<ExchangeRates | null> {
  try {
    const res = await apiFetch(`/rates?base=${base}`);
    if (!res.ok) return null;
    return (await res.json()) as ExchangeRates;
  } catch {
    return null;
  }
}

/** Mostra "guardado / alvo" nas outras moedas. Usar dentro de <Suspense>. */
export async function ConvertedAmount({
  savedCents,
  targetCents,
  base,
  targets,
}: {
  savedCents: number;
  targetCents: number;
  base: Currency;
  /** Moedas a mostrar. Padrão: todas, menos a base. */
  targets?: Currency[];
}) {
  const shown = targets ?? ALL.filter((c) => c !== base);
  if (shown.length === 0) return null;
  const data = await getRates(base);
  if (!data) {
    return (
      <p className="mt-1 text-xs text-zinc-400">Câmbio indisponível agora.</p>
    );
  }

  return (
    <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
      {shown
        .map(
          (c) =>
            `${formatMoney(savedCents * data.rates[c], c)} de ${formatMoney(
              targetCents * data.rates[c],
              c,
            )}`,
        )
        .join(" · ")}
      <span className="ml-2 text-zinc-400">cotação de {data.date}</span>
    </p>
  );
}
