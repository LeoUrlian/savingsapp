import { Injectable } from '@nestjs/common';
import type { HealthResponse } from '@migra/shared';

@Injectable()
export class AppService {
  getHealth(): HealthResponse {
    return {
      status: 'ok',
      service: 'migra-api',
      timestamp: new Date().toISOString(),
    };
  }
}
