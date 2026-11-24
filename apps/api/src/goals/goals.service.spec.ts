import type { Currency } from '@savings/shared';
import { CurrencyService } from '../currency/currency.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { GoalsService } from './goals.service.js';

type Deposit = { amountCents: number; currency: Currency };

/** Cotação fixa: 1 BRL = 0,20 USD = 0,10 EUR. */
const RATES = { BRL: 1, USD: 0.2, EUR: 0.1 };

function makeService(deposits: Deposit[], baseCurrency: Currency = 'BRL') {
  const getRates = vi.fn(async (base: Currency) => ({
    base,
    date: '2026-11-16',
    rates: RATES,
  }));
  const row = {
    id: 'goal-1',
    name: 'Viagem',
    targetAmountCents: 2_000_000,
    baseCurrency,
    targetDate: null,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    deposits,
  };
  const prisma = {
    goal: { findFirst: vi.fn(async () => row) },
  };
  const service = new GoalsService(
    prisma as unknown as PrismaService,
    { getRates } as unknown as CurrencyService,
  );
  return { service, getRates };
}

describe('GoalsService - soma de aportes', () => {
  it('soma aportes na mesma moeda sem buscar cotação', async () => {
    const { service, getRates } = makeService([
      { amountCents: 10_000, currency: 'BRL' },
      { amountCents: 2_500, currency: 'BRL' },
    ]);

    const goal = await service.findOne('user-1', 'goal-1');

    expect(goal.savedAmountCents).toBe(12_500);
    expect(getRates).not.toHaveBeenCalled();
  });

  it('converte aporte em USD para a moeda da meta (BRL)', async () => {
    // US$ 10,00 / 0,20 = R$ 50,00
    const { service, getRates } = makeService([
      { amountCents: 1_000, currency: 'USD' },
    ]);

    const goal = await service.findOne('user-1', 'goal-1');

    expect(goal.savedAmountCents).toBe(5_000);
    expect(getRates).toHaveBeenCalledWith('BRL');
  });

  it('soma aportes de moedas misturadas', async () => {
    // R$ 100,00 + US$ 10,00 (=R$ 50,00) + € 5,00 (=R$ 50,00) = R$ 200,00
    const { service } = makeService([
      { amountCents: 10_000, currency: 'BRL' },
      { amountCents: 1_000, currency: 'USD' },
      { amountCents: 500, currency: 'EUR' },
    ]);

    const goal = await service.findOne('user-1', 'goal-1');

    expect(goal.savedAmountCents).toBe(20_000);
  });

  it('arredonda o total para centavos inteiros', async () => {
    // 1 centavo de USD / 0,20 = 5 centavos; 1 de EUR / 0,10 = 10 centavos
    // e um valor que gera fração: 3 / 0,20 = 15; use 1 / 0,3 abaixo.
    const getRates = vi.fn(async (base: Currency) => ({
      base,
      date: '2026-11-16',
      rates: { BRL: 1, USD: 0.3, EUR: 0.1 },
    }));
    const prisma = {
      goal: {
        findFirst: vi.fn(async () => ({
          id: 'g',
          name: 'x',
          targetAmountCents: 1000,
          baseCurrency: 'BRL',
          targetDate: null,
          createdAt: new Date(),
          deposits: [{ amountCents: 100, currency: 'USD' }],
        })),
      },
    };
    const service = new GoalsService(
      prisma as unknown as PrismaService,
      { getRates } as unknown as CurrencyService,
    );

    const goal = await service.findOne('user-1', 'g');

    // 100 / 0,3 = 333,33... -> 333
    expect(goal.savedAmountCents).toBe(333);
    expect(Number.isInteger(goal.savedAmountCents)).toBe(true);
  });

  it('meta sem aportes tem saldo zero', async () => {
    const { service } = makeService([]);

    const goal = await service.findOne('user-1', 'goal-1');

    expect(goal.savedAmountCents).toBe(0);
  });
});
