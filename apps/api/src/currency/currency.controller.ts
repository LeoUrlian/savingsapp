import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import type { Currency, ExchangeRates } from '@savings/shared';
import { CurrencyService } from './currency.service.js';

const VALID: Currency[] = ['BRL', 'USD', 'EUR'];

/** GET /rates?base=BRL  → cotação de 1 BRL em BRL, USD e EUR. */
@Controller('rates')
export class CurrencyController {
  constructor(private readonly currencyService: CurrencyService) {}

  @Get()
  getRates(@Query('base') base: string = 'BRL'): Promise<ExchangeRates> {
    if (!VALID.includes(base as Currency)) {
      throw new BadRequestException(`base deve ser uma de: ${VALID.join(', ')}`);
    }
    return this.currencyService.getRates(base as Currency);
  }
}
