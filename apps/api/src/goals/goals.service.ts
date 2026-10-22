import { Injectable, NotFoundException } from '@nestjs/common';
import type { Goal } from '@savings/shared';
import { PrismaService } from '../prisma/prisma.service.js';
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
  deposits: { amountCents: number }[];
};

@Injectable()
export class GoalsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Converte o registro do banco para o tipo Goal do contrato compartilhado:
   * datas viram ISO string e savedAmountCents é a soma dos aportes.
   */
  private toGoal(row: GoalWithDeposits): Goal {
    const savedAmountCents = row.deposits.reduce(
      (sum, d) => sum + d.amountCents,
      0,
    );
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

  async create(dto: CreateGoalDto): Promise<Goal> {
    const row = await this.prisma.goal.create({
      data: {
        name: dto.name,
        targetAmountCents: dto.targetAmountCents,
        baseCurrency: dto.baseCurrency ?? 'BRL',
        targetDate: dto.targetDate ? new Date(dto.targetDate) : null,
      },
      include: { deposits: { select: { amountCents: true } } },
    });
    return this.toGoal(row);
  }

  async findAll(): Promise<Goal[]> {
    const rows = await this.prisma.goal.findMany({
      orderBy: { createdAt: 'desc' },
      include: { deposits: { select: { amountCents: true } } },
    });
    return rows.map((row) => this.toGoal(row));
  }

  async findOne(id: string): Promise<Goal> {
    const row = await this.prisma.goal.findUnique({
      where: { id },
      include: { deposits: { select: { amountCents: true } } },
    });
    if (!row) {
      throw new NotFoundException(`Meta ${id} não encontrada`);
    }
    return this.toGoal(row);
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
      include: { deposits: { select: { amountCents: true } } },
    });
    return this.toGoal(row);
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
