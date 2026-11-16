import type { Currency } from "@savings/shared";

/** Formata centavos na moeda indicada (pt-BR). */
export function formatMoney(cents: number, currency: Currency): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency }).format(
    cents / 100,
  );
}
