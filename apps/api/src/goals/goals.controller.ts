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
import type { Goal } from '@savings/shared';
import { GoalsService } from './goals.service.js';
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
  create(@Body() dto: CreateGoalDto): Promise<Goal> {
    return this.goalsService.create(dto);
  }

  @Get()
  findAll(): Promise<Goal[]> {
    return this.goalsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<Goal> {
    return this.goalsService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateGoalDto,
  ): Promise<Goal> {
    return this.goalsService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@Param('id') id: string): Promise<void> {
    return this.goalsService.remove(id);
  }
}
