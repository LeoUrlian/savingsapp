import { Module } from '@nestjs/common';
import { GoalsModule } from '../goals/goals.module.js';
import { AiController } from './ai.controller.js';
import { AiService } from './ai.service.js';

@Module({
  imports: [GoalsModule],
  controllers: [AiController],
  providers: [AiService],
})
export class AiModule {}
