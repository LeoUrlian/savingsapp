import { BadGatewayException, Injectable, Logger } from '@nestjs/common';
import type { Currency, ExchangeRates } from '@savings/shared';

const CURRENCIES: Currency[] = ['BRL', 'USD', 'EUR'];
const FRANKFURTER_URL = 'https://api.frankfurter.dev/v1/latest';
/** Cotações do BCE mudam uma vez por dia; 1h de cache basta. */
const TTL_MS = 60 * 60 * 1000;

@Injectable()
export class CurrencyService {
  private readonly logger = new Logger(CurrencyService.name);
  private readonly cache = new Map<
    Currency,
    { value: ExchangeRates; expiresAt: number }
  >();

  async getRates(base: Currency): Promise<ExchangeRates> {
    const cached = this.cache.get(base);
    if (cached && cached.expiresAt > Date.now()) return cached.value;

    try {
      const value = await this.fetchRates(base);
      this.cache.set(base, { value, expiresAt: Date.now() + TTL_MS });
      return value;
    } catch (err) {
      this.logger.warn(`Falha ao buscar câmbio: ${String(err)}`);
      // Melhor uma cotação velha do que nenhuma.
      if (cached) return cached.value;
      throw new BadGatewayException('Serviço de câmbio indisponível');
    }
  }

  private async fetchRates(base: Currency): Promise<ExchangeRates> {
    const symbols = CURRENCIES.filter((c) => c !== base).join(',');
    const res = await fetch(`${FRANKFURTER_URL}?base=${base}&symbols=${symbols}`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const body = (await res.json()) as {
      date: string;
      rates: Partial<Record<Currency, number>>;
    };

    const rates = { BRL: 1, USD: 1, EUR: 1 } as Record<Currency, number>;
    for (const c of CURRENCIES) {
      if (c === base) continue;
      const rate = body.rates[c];
      if (typeof rate !== 'number') throw new Error(`Sem cotação para ${c}`);
      rates[c] = rate;
    }
    return { base, date: body.date, rates };
  }
}
