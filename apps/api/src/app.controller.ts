import { Controller, Get } from '@nestjs/common';
import type { HealthResponse } from '@savings/shared';
import { AppService } from './app.service.js';
import { Public } from './auth/auth.guard.js';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Public()
  @Get('health')
  getHealth(): HealthResponse {
    return this.appService.getHealth();
  }
}
