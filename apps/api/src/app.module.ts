import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { GoalsModule } from './goals/goals.module.js';
import { CurrencyModule } from './currency/currency.module.js';
import { AiModule } from './ai/ai.module.js';
import { AuthModule } from './auth/auth.module.js';

@Module({
  imports: [PrismaModule, AuthModule, GoalsModule, CurrencyModule, AiModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
