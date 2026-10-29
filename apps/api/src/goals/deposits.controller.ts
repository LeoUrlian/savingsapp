import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
} from '@nestjs/common';
import type { Deposit } from '@savings/shared';
import { DepositsService } from './deposits.service.js';
import { CreateDepositDto } from './dto/create-deposit.dto.js';

/**
 * Aportes aninhados sob a meta — um aporte sempre pertence a uma meta.
 *   POST   /goals/:goalId/deposits        registra aporte
 *   GET    /goals/:goalId/deposits        lista aportes da meta
 *   DELETE /goals/:goalId/deposits/:id    remove um aporte
 */
@Controller('goals/:goalId/deposits')
export class DepositsController {
  constructor(private readonly depositsService: DepositsService) {}

  @Post()
  create(
    @Param('goalId') goalId: string,
    @Body() dto: CreateDepositDto,
  ): Promise<Deposit> {
    return this.depositsService.create(goalId, dto);
  }

  @Get()
  findAll(@Param('goalId') goalId: string): Promise<Deposit[]> {
    return this.depositsService.findAllForGoal(goalId);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(
    @Param('goalId') goalId: string,
    @Param('id') id: string,
  ): Promise<void> {
    return this.depositsService.remove(goalId, id);
  }
}
