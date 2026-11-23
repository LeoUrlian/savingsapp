/**
 * Contrato compartilhado entre a API (NestJS) e o front (Next.js).
 * Definir os tipos UMA vez aqui e importar nos dois lados é o que dá
 * segurança de ponta a ponta: se a API muda a forma de uma resposta,
 * o TypeScript quebra o build do front na hora.
 *
 * Domínio: SavingsApp — metas de poupança com projeções e multi-moeda.
 * Na Fatia 0 temos só o health-check + o esqueleto dos tipos de domínio;
 * CRUD de metas, aportes, câmbio e projeções entram nas fatias seguintes.
 */

/** Moedas suportadas na exibição de valores. */
export type Currency = "BRL" | "USD" | "EUR";

/** Resposta do endpoint GET /rates?base=BRL */
export interface ExchangeRates {
  base: Currency;
  /** Data da cotação (YYYY-MM-DD). */
  date: string;
  /** Quanto vale 1 unidade da moeda base em cada moeda (base = 1). */
  rates: Record<Currency, number>;
}

/** Resposta do endpoint GET /health */
export interface HealthResponse {
  status: "ok";
  service: string;
  timestamp: string; // ISO 8601
}

/**
 * Meta de poupança: um objetivo com valor-alvo numa moeda base.
 * (esqueleto — ganha persistência e campos na Fatia 1)
 */
export interface Goal {
  id: string;
  name: string;
  /** Valor-alvo, em centavos, para evitar erro de ponto flutuante. */
  targetAmountCents: number;
  /** Quanto já foi guardado, em centavos. */
  savedAmountCents: number;
  /** Moeda em que a meta foi definida. */
  baseCurrency: Currency;
  /** Data-alvo opcional (ISO 8601) para alcançar a meta. */
  targetDate?: string;
  createdAt: string; // ISO 8601
}

/** Um aporte (depósito) feito em direção a uma meta. */
export interface Deposit {
  id: string;
  goalId: string;
  amountCents: number;
  currency: Currency;
  createdAt: string; // ISO 8601
}

/** Um ponto do histórico: saldo acumulado da meta após um aporte. */
export interface GoalHistoryPoint {
  date: string; // ISO 8601
  /** Saldo acumulado em centavos, na moeda da meta. */
  cumulativeCents: number;
}

/** Resposta do endpoint GET /goals/:id/stats */
export interface GoalStats {
  goalId: string;
  currency: Currency;
  targetAmountCents: number;
  savedAmountCents: number;
  /** 0 a 100. Passa de 100 só se a meta foi superada: aqui fica limitado a 100. */
  progressPct: number;
  depositCount: number;
  /** Ritmo médio de poupança por mês, em centavos. 0 se não há aportes. */
  monthlyPaceCents: number;
  history: GoalHistoryPoint[];
  /** Aportes somados por mês (AAAA-MM, fuso de Brasília), do primeiro mês até o atual, com meses vazios em 0. */
  monthly: { month: string; amountCents: number }[];
  /** Data estimada para atingir a meta, no ritmo atual. Ausente se não dá para estimar. */
  projectedDate?: string;
  /** true se a meta foi atingida. */
  reached: boolean;
  /** Com data-alvo: se a data projetada é igual ou anterior a ela. */
  onTrack?: boolean;
}
