import { Module } from '@nestjs/common';
import { GoalsController } from './goals.controller.js';
import { GoalsService } from './goals.service.js';
import { DepositsController } from './deposits.controller.js';
import { DepositsService } from './deposits.service.js';
import { CurrencyModule } from '../currency/currency.module.js';

@Module({
  imports: [CurrencyModule],
  controllers: [GoalsController, DepositsController],
  providers: [GoalsService, DepositsService],
  exports: [GoalsService],
})
export class GoalsModule {}
