import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import type { Goal, GoalStats } from '@savings/shared';
import { GoalsService } from './goals.service.js';
import { CurrentUser } from '../auth/auth.guard.js';
import type { AuthUser } from '../auth/auth.service.js';
import { CreateGoalDto } from './dto/create-goal.dto.js';
import { UpdateGoalDto } from './dto/update-goal.dto.js';

/**
 * CRUD de metas de poupança.
 *   POST   /goals        cria
 *   GET    /goals        lista
 *   GET    /goals/:id    detalha
 *   PATCH  /goals/:id    atualiza (parcial)
 *   DELETE /goals/:id    remove
 */
@Controller('goals')
export class GoalsController {
  constructor(private readonly goalsService: GoalsService) {}

  @Post()
  create(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateGoalDto,
  ): Promise<Goal> {
    return this.goalsService.create(user.id, dto);
  }

  @Get()
  findAll(@CurrentUser() user: AuthUser): Promise<Goal[]> {
    return this.goalsService.findAll(user.id);
  }

  @Get(':id/stats')
  stats(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ): Promise<GoalStats> {
    return this.goalsService.getStats(user.id, id);
  }

  @Get(':id')
  findOne(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ): Promise<Goal> {
    return this.goalsService.findOne(user.id, id);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateGoalDto,
  ): Promise<Goal> {
    return this.goalsService.update(user.id, id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ): Promise<void> {
    return this.goalsService.remove(user.id, id);
  }
}
