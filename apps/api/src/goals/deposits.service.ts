import { Injectable, NotFoundException } from '@nestjs/common';
import type { Deposit } from '@savings/shared';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateDepositDto } from './dto/create-deposit.dto.js';

/** Registro de Deposit vindo do Prisma. */
type DepositRow = {
  id: string;
  goalId: string;
  amountCents: number;
  currency: 'BRL' | 'USD' | 'EUR';
  createdAt: Date;
};

@Injectable()
export class DepositsService {
  constructor(private readonly prisma: PrismaService) {}

  private toDeposit(row: DepositRow): Deposit {
    return {
      id: row.id,
      goalId: row.goalId,
      amountCents: row.amountCents,
      currency: row.currency,
      createdAt: row.createdAt.toISOString(),
    };
  }

  async create(goalId: string, dto: CreateDepositDto): Promise<Deposit> {
    await this.ensureGoalExists(goalId);
    const row = await this.prisma.deposit.create({
      data: {
        goalId,
        amountCents: dto.amountCents,
        currency: dto.currency ?? 'BRL',
      },
    });
    return this.toDeposit(row);
  }

  async findAllForGoal(goalId: string): Promise<Deposit[]> {
    await this.ensureGoalExists(goalId);
    const rows = await this.prisma.deposit.findMany({
      where: { goalId },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((row) => this.toDeposit(row));
  }

  async remove(goalId: string, id: string): Promise<void> {
    await this.ensureGoalExists(goalId);
    // Confirma que o aporte existe E pertence a esta meta (evita apagar
    // aporte de outra meta passando um id alheio na rota).
    const found = await this.prisma.deposit.findFirst({
      where: { id, goalId },
      select: { id: true },
    });
    if (!found) {
      throw new NotFoundException(
        `Aporte ${id} não encontrado na meta ${goalId}`,
      );
    }
    await this.prisma.deposit.delete({ where: { id } });
  }

  private async ensureGoalExists(goalId: string): Promise<void> {
    const count = await this.prisma.goal.count({ where: { id: goalId } });
    if (count === 0) {
      throw new NotFoundException(`Meta ${goalId} não encontrada`);
    }
  }
}
