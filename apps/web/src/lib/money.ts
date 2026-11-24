import type { Currency } from "@savings/shared";

/** Formata centavos na moeda indicada (pt-BR). */
export function formatMoney(cents: number, currency: Currency): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency }).format(
    cents / 100,
  );
}

/**
 * Lê um valor digitado pelo usuário e devolve centavos, ou null se inválido.
 * Aceita "20000", "20000,50", "20.000,50" e "20000.50".
 */
export function parseMoneyToCents(input: string): number | null {
  let s = input.trim().replace(/[^\d.,]/g, "");
  if (!s) return null;
  if (s.includes(",")) {
    // Vírgula é o decimal; pontos são separador de milhar.
    s = s.replace(/\./g, "").replace(",", ".");
  }
  const value = Number(s);
  if (!Number.isFinite(value) || value <= 0) return null;
  return Math.round(value * 100);
}
