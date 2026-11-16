import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { GoalsModule } from './goals/goals.module.js';
import { CurrencyModule } from './currency/currency.module.js';

@Module({
  imports: [PrismaModule, GoalsModule, CurrencyModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
