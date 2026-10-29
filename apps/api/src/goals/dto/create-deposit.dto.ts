import { IsEnum, IsInt, IsOptional, Min } from 'class-validator';
import type { Currency } from '@savings/shared';

/**
 * Dados aceitos para registrar um aporte numa meta. O goalId NÃO vem no corpo:
 * ele vem da rota (/goals/:goalId/deposits), que é a dona do recurso.
 */
export class CreateDepositDto {
  /** Valor do aporte em centavos (inteiro, positivo). */
  @IsInt()
  @Min(1)
  amountCents!: number;

  /** Moeda do aporte; default BRL se omitida. */
  @IsOptional()
  @IsEnum(['BRL', 'USD', 'EUR'])
  currency?: Currency;
}
