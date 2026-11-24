import { computeGoalStats, type StatsInput } from './goal-stats.js';

const NOW = new Date('2026-11-23T12:00:00Z');
const day = (n: number) => new Date(NOW.getTime() - n * 24 * 60 * 60 * 1000);

function input(over: Partial<StatsInput> = {}): StatsInput {
  return {
    goalId: 'g1',
    currency: 'BRL',
    targetAmountCents: 100_000,
    targetDate: null,
    deposits: [],
    now: NOW,
    ...over,
  };
}

describe('computeGoalStats', () => {
  it('meta sem aportes: zero, sem projeção', () => {
    const s = computeGoalStats(input());

    expect(s.savedAmountCents).toBe(0);
    expect(s.progressPct).toBe(0);
    expect(s.depositCount).toBe(0);
    expect(s.monthlyPaceCents).toBe(0);
    expect(s.history).toEqual([]);
    expect(s.projectedDate).toBeUndefined();
    expect(s.reached).toBe(false);
  });

  it('histórico é acumulado e ordenado por data', () => {
    const s = computeGoalStats(
      input({
        deposits: [
          { amountCents: 3_000, createdAt: day(1) },
          { amountCents: 10_000, createdAt: day(20) },
          { amountCents: 5_000, createdAt: day(10) },
        ],
      }),
    );

    expect(s.history.map((h) => h.cumulativeCents)).toEqual([
      10_000, 15_000, 18_000,
    ]);
    expect(s.savedAmountCents).toBe(18_000);
    expect(s.progressPct).toBe(18);
  });

  it('projeta a data pelo ritmo desde o primeiro aporte', () => {
    // 30.000 guardados em 60 dias = 500/dia. Faltam 70.000 -> 140 dias.
    const s = computeGoalStats(
      input({ deposits: [{ amountCents: 30_000, createdAt: day(60) }] }),
    );

    expect(s.monthlyPaceCents).toBe(Math.round(500 * 30.4375));
    const days = Math.round(
      (new Date(s.projectedDate!).getTime() - NOW.getTime()) / 86_400_000,
    );
    expect(days).toBe(140);
  });

  it('janela mínima de 30 dias evita projeção absurda', () => {
    // Aporte de hoje: ritmo medido em 30 dias, não em 0.
    const s = computeGoalStats(
      input({ deposits: [{ amountCents: 30_000, createdAt: NOW }] }),
    );

    expect(s.monthlyPaceCents).toBe(Math.round((30_000 / 30) * 30.4375));
  });

  it('meta atingida: sem projeção e no prazo', () => {
    const s = computeGoalStats(
      input({
        targetDate: day(-5),
        deposits: [{ amountCents: 120_000, createdAt: day(10) }],
      }),
    );

    expect(s.reached).toBe(true);
    expect(s.progressPct).toBe(100);
    expect(s.projectedDate).toBeUndefined();
    expect(s.onTrack).toBe(true);
  });

  it('com data-alvo: no ritmo certo', () => {
    // Projeção em 140 dias; prazo em 200 dias.
    const s = computeGoalStats(
      input({
        targetDate: day(-200),
        deposits: [{ amountCents: 30_000, createdAt: day(60) }],
      }),
    );

    expect(s.onTrack).toBe(true);
  });

  it('com data-alvo: atrasado', () => {
    // Projeção em 140 dias; prazo em 100 dias.
    const s = computeGoalStats(
      input({
        targetDate: day(-100),
        deposits: [{ amountCents: 30_000, createdAt: day(60) }],
      }),
    );

    expect(s.onTrack).toBe(false);
  });

  it('sem data-alvo, onTrack fica indefinido', () => {
    const s = computeGoalStats(
      input({ deposits: [{ amountCents: 30_000, createdAt: day(60) }] }),
    );

    expect(s.onTrack).toBeUndefined();
  });
});

describe('groupByMonth (via computeGoalStats.monthly)', () => {
  it('soma por mês e preenche meses vazios com 0', () => {
    const s = computeGoalStats(
      input({
        deposits: [
          { amountCents: 1_000, createdAt: new Date('2026-08-10T12:00:00Z') },
          { amountCents: 500, createdAt: new Date('2026-08-20T12:00:00Z') },
          { amountCents: 2_000, createdAt: new Date('2026-10-05T12:00:00Z') },
        ],
      }),
    );

    expect(s.monthly).toEqual([
      { month: '2026-08', amountCents: 1_500 },
      { month: '2026-09', amountCents: 0 },
      { month: '2026-10', amountCents: 2_000 },
      { month: '2026-11', amountCents: 0 },
    ]);
  });

  it('sem aportes, lista vazia', () => {
    expect(computeGoalStats(input()).monthly).toEqual([]);
  });

  it('atravessa a virada de ano', () => {
    const s = computeGoalStats(
      input({
        now: new Date('2027-02-10T12:00:00Z'),
        deposits: [
          { amountCents: 100, createdAt: new Date('2026-12-15T12:00:00Z') },
        ],
      }),
    );

    expect(s.monthly.map((m) => m.month)).toEqual([
      '2026-12',
      '2027-01',
      '2027-02',
    ]);
  });

  it('conta o mês no horário de Brasília (UTC-3)', () => {
    // 01/set 01:00 UTC = 31/ago 22:00 em Brasília -> conta em agosto.
    // 01/set 04:00 UTC = 01/set 01:00 em Brasília -> conta em setembro.
    const s = computeGoalStats(
      input({
        now: new Date('2026-09-15T12:00:00Z'),
        deposits: [
          { amountCents: 100, createdAt: new Date('2026-09-01T01:00:00Z') },
          { amountCents: 200, createdAt: new Date('2026-09-01T04:00:00Z') },
        ],
      }),
    );

    expect(s.monthly).toEqual([
      { month: '2026-08', amountCents: 100 },
      { month: '2026-09', amountCents: 200 },
    ]);
  });
});

describe('requiredMonthlyCents', () => {
  const saved = [{ amountCents: 40_000, createdAt: day(30) }];

  it('divide o que falta pelos meses até a data-alvo', () => {
    // Faltam 60.000. Prazo: 2 meses médios (60,875 dias).
    const s = computeGoalStats(
      input({ targetDate: day(-60.875), deposits: saved }),
    );

    expect(s.requiredMonthlyCents).toBe(30_000);
  });

  it('prazo menor que 1 mês conta como 1 mês', () => {
    const s = computeGoalStats(input({ targetDate: day(-5), deposits: saved }));

    expect(s.requiredMonthlyCents).toBe(60_000);
  });

  it('prazo já vencido: valor que falta inteiro', () => {
    const s = computeGoalStats(input({ targetDate: day(10), deposits: saved }));

    expect(s.requiredMonthlyCents).toBe(60_000);
  });

  it('ausente sem data-alvo', () => {
    const s = computeGoalStats(input({ deposits: saved }));

    expect(s.requiredMonthlyCents).toBeUndefined();
  });

  it('ausente com a meta atingida', () => {
    const s = computeGoalStats(
      input({
        targetDate: day(-60),
        deposits: [{ amountCents: 100_000, createdAt: day(10) }],
      }),
    );

    expect(s.requiredMonthlyCents).toBeUndefined();
  });

  it('meta sem aportes: precisa guardar o valor todo, dividido pelo prazo', () => {
    const s = computeGoalStats(input({ targetDate: day(-60.875) }));

    expect(s.requiredMonthlyCents).toBe(50_000);
  });
});
