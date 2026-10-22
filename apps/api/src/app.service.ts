import { Injectable } from '@nestjs/common';
import type { HealthResponse } from '@savings/shared';

@Injectable()
export class AppService {
  getHealth(): HealthResponse {
    return {
      status: 'ok',
      service: 'savings-api',
      timestamp: new Date().toISOString(),
    };
  }
}
