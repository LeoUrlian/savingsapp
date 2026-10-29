import { Module } from '@nestjs/common';
import { GoalsController } from './goals.controller.js';
import { GoalsService } from './goals.service.js';
import { DepositsController } from './deposits.controller.js';
import { DepositsService } from './deposits.service.js';

@Module({
  controllers: [GoalsController, DepositsController],
  providers: [GoalsService, DepositsService],
})
export class GoalsModule {}
