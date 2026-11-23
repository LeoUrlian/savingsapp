import type { Currency, GoalHistoryPoint, GoalStats } from '@savings/shared';

const DAY_MS = 24 * 60 * 60 * 1000;
/** Dias por mês médio. */
const MONTH_DAYS = 30.4375;
/**
 * Janela mínima para medir o ritmo. Sem ela, um aporte feito hoje daria um
 * ritmo "por dia" enorme e uma projeção absurda.
 */
const MIN_WINDOW_DAYS = 30;
/**
 * Fuso de Brasília (UTC-3). O Brasil não usa horário de verão desde 2019, então
 * o deslocamento é fixo. Os meses são contados neste fuso.
 */
const BRT_OFFSET_MS = 3 * 60 * 60 * 1000;
/** Data deslocada para Brasília: os getters UTC dela dão a hora de parede de lá. */
const toBrt = (d: Date) => new Date(d.getTime() - BRT_OFFSET_MS);

export interface StatsDeposit {
  /** Valor já convertido para a moeda da meta, em centavos. */
  amountCents: number;
  createdAt: Date;
}

export interface StatsInput {
  goalId: string;
  currency: Currency;
  targetAmountCents: number;
  targetDate: Date | null;
  deposits: StatsDeposit[];
  now: Date;
}

/** Soma os aportes por mês (fuso de Brasília), preenchendo meses sem aporte com 0. */
export function groupByMonth(
  deposits: StatsDeposit[],
  now: Date,
): { month: string; amountCents: number }[] {
  if (deposits.length === 0) return [];
  const key = (d: Date) => toBrt(d).toISOString().slice(0, 7);
  const totals = new Map<string, number>();
  for (const d of deposits) {
    const k = key(d.createdAt);
    totals.set(k, (totals.get(k) ?? 0) + d.amountCents);
  }
  const first = deposits.reduce(
    (min, d) => (d.createdAt < min ? d.createdAt : min),
    deposits[0].createdAt,
  );
  const out: { month: string; amountCents: number }[] = [];
  const firstBrt = toBrt(first);
  let y = firstBrt.getUTCFullYear();
  let m = firstBrt.getUTCMonth();
  const endKey = key(now);
  for (;;) {
    const k = `${y}-${String(m + 1).padStart(2, '0')}`;
    out.push({ month: k, amountCents: Math.round(totals.get(k) ?? 0) });
    if (k >= endKey) break;
    m += 1;
    if (m > 11) {
      m = 0;
      y += 1;
    }
  }
  return out;
}

/** Calcula histórico, ritmo e projeção. Função pura, sem banco nem rede. */
export function computeGoalStats(input: StatsInput): GoalStats {
  const { goalId, currency, targetAmountCents, targetDate, now } = input;
  const deposits = [...input.deposits].sort(
    (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
  );

  let running = 0;
  const history: GoalHistoryPoint[] = deposits.map((d) => {
    running += d.amountCents;
    return {
      date: d.createdAt.toISOString(),
      cumulativeCents: Math.round(running),
    };
  });

  const savedAmountCents = Math.round(running);
  const reached = savedAmountCents >= targetAmountCents;
  const progressPct = Math.min(
    100,
    Math.round((savedAmountCents / targetAmountCents) * 100),
  );

  let monthlyPaceCents = 0;
  let projectedDate: string | undefined;

  if (deposits.length > 0 && savedAmountCents > 0) {
    const first = deposits[0].createdAt.getTime();
    const elapsedDays = Math.max(
      MIN_WINDOW_DAYS,
      (now.getTime() - first) / DAY_MS,
    );
    const dailyPace = savedAmountCents / elapsedDays;
    monthlyPaceCents = Math.round(dailyPace * MONTH_DAYS);

    if (!reached) {
      const daysLeft = (targetAmountCents - savedAmountCents) / dailyPace;
      projectedDate = new Date(now.getTime() + daysLeft * DAY_MS).toISOString();
    }
  }

  let onTrack: boolean | undefined;
  if (targetDate) {
    if (reached) onTrack = true;
    else if (projectedDate)
      onTrack = new Date(projectedDate).getTime() <= targetDate.getTime();
    else onTrack = false;
  }

  return {
    goalId,
    currency,
    targetAmountCents,
    savedAmountCents,
    progressPct,
    depositCount: deposits.length,
    monthlyPaceCents,
    history,
    monthly: groupByMonth(deposits, now),
    projectedDate,
    reached,
    onTrack,
  };
}
