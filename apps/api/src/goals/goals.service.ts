import { Injectable, NotFoundException } from '@nestjs/common';
import type { Currency, Goal, GoalStats } from '@savings/shared';
import { computeGoalStats } from './goal-stats.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CurrencyService } from '../currency/currency.service.js';
import { CreateGoalDto } from './dto/create-goal.dto.js';
import { UpdateGoalDto } from './dto/update-goal.dto.js';

/** Registro de Goal vindo do Prisma, já com os deposits agregados. */
type GoalWithDeposits = {
  id: string;
  name: string;
  targetAmountCents: number;
  baseCurrency: 'BRL' | 'USD' | 'EUR';
  targetDate: Date | null;
  createdAt: Date;
  deposits: { amountCents: number; currency: Currency }[];
};

@Injectable()
export class GoalsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly currencyService: CurrencyService,
  ) {}

  /**
   * Converte o registro do banco para o tipo Goal do contrato compartilhado:
   * datas viram ISO string e savedAmountCents é a soma dos aportes.
   */
  private async toGoal(row: GoalWithDeposits): Promise<Goal> {
    const savedAmountCents = await this.sumInBaseCurrency(row);
    return {
      id: row.id,
      name: row.name,
      targetAmountCents: row.targetAmountCents,
      savedAmountCents,
      baseCurrency: row.baseCurrency,
      targetDate: row.targetDate ? row.targetDate.toISOString() : undefined,
      createdAt: row.createdAt.toISOString(),
    };
  }

  /**
   * Soma os aportes na moeda da meta. Aporte em outra moeda é convertido pela
   * cotação atual (rates[X] = quanto 1 unidade da base vale em X, então
   * valor_na_base = valor_em_X / rates[X]). Só busca cotação se houver aporte
   * em moeda diferente.
   */
  private async sumInBaseCurrency(row: GoalWithDeposits): Promise<number> {
    const needsRates = row.deposits.some(
      (d) => d.currency !== row.baseCurrency,
    );
    const rates = needsRates
      ? (await this.currencyService.getRates(row.baseCurrency)).rates
      : undefined;
    const total = row.deposits.reduce((sum, d) => {
      if (d.currency === row.baseCurrency || !rates) return sum + d.amountCents;
      return sum + d.amountCents / rates[d.currency];
    }, 0);
    return Math.round(total);
  }

  /** Histórico, ritmo e projeção de uma meta (aportes convertidos para a moeda da meta). */
  async getStats(id: string): Promise<GoalStats> {
    const row = await this.prisma.goal.findUnique({
      where: { id },
      include: {
        deposits: {
          select: { amountCents: true, currency: true, createdAt: true },
        },
      },
    });
    if (!row) {
      throw new NotFoundException(`Meta ${id} não encontrada`);
    }

    const needsRates = row.deposits.some(
      (d) => d.currency !== row.baseCurrency,
    );
    const rates = needsRates
      ? (await this.currencyService.getRates(row.baseCurrency)).rates
      : undefined;

    return computeGoalStats({
      goalId: row.id,
      currency: row.baseCurrency,
      targetAmountCents: row.targetAmountCents,
      targetDate: row.targetDate,
      now: new Date(),
      deposits: row.deposits.map((d) => ({
        createdAt: d.createdAt,
        amountCents:
          d.currency === row.baseCurrency || !rates
            ? d.amountCents
            : d.amountCents / rates[d.currency],
      })),
    });
  }

  async create(dto: CreateGoalDto): Promise<Goal> {
    const row = await this.prisma.goal.create({
      data: {
        name: dto.name,
        targetAmountCents: dto.targetAmountCents,
        baseCurrency: dto.baseCurrency ?? 'BRL',
        targetDate: dto.targetDate ? new Date(dto.targetDate) : null,
      },
      include: { deposits: { select: { amountCents: true, currency: true } } },
    });
    return await this.toGoal(row);
  }

  async findAll(): Promise<Goal[]> {
    const rows = await this.prisma.goal.findMany({
      orderBy: { createdAt: 'desc' },
      include: { deposits: { select: { amountCents: true, currency: true } } },
    });
    return Promise.all(rows.map((row) => this.toGoal(row)));
  }

  async findOne(id: string): Promise<Goal> {
    const row = await this.prisma.goal.findUnique({
      where: { id },
      include: { deposits: { select: { amountCents: true, currency: true } } },
    });
    if (!row) {
      throw new NotFoundException(`Meta ${id} não encontrada`);
    }
    return await this.toGoal(row);
  }

  async update(id: string, dto: UpdateGoalDto): Promise<Goal> {
    await this.ensureExists(id);
    const row = await this.prisma.goal.update({
      where: { id },
      data: {
        name: dto.name,
        targetAmountCents: dto.targetAmountCents,
        baseCurrency: dto.baseCurrency,
        targetDate:
          dto.targetDate === undefined
            ? undefined
            : dto.targetDate
              ? new Date(dto.targetDate)
              : null,
      },
      include: { deposits: { select: { amountCents: true, currency: true } } },
    });
    return await this.toGoal(row);
  }

  async remove(id: string): Promise<void> {
    await this.ensureExists(id);
    // onDelete: Cascade no schema remove os deposits junto.
    await this.prisma.goal.delete({ where: { id } });
  }

  private async ensureExists(id: string): Promise<void> {
    const count = await this.prisma.goal.count({ where: { id } });
    if (count === 0) {
      throw new NotFoundException(`Meta ${id} não encontrada`);
    }
  }
}
