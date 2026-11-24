import { Controller, HttpCode, Param, Post } from '@nestjs/common';
import type { GoalAdvice } from '@savings/shared';
import { GoalsService } from '../goals/goals.service.js';
import { AiService } from './ai.service.js';
import { CurrentUser } from '../auth/auth.guard.js';
import type { AuthUser } from '../auth/auth.service.js';

/** POST /goals/:goalId/advice  -> análise em texto, gerada pela IA. */
@Controller('goals/:goalId/advice')
export class AiController {
  constructor(
    private readonly goalsService: GoalsService,
    private readonly aiService: AiService,
  ) {}

  @Post()
  @HttpCode(200)
  async advise(
    @CurrentUser() user: AuthUser,
    @Param('goalId') goalId: string,
  ): Promise<GoalAdvice> {
    const stats = await this.goalsService.getStats(user.id, goalId);
    return this.aiService.adviseOnGoal(stats);
  }
}
