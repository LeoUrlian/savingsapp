import {
  IsEnum,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  Min,
} from 'class-validator';
import type { Currency } from '@savings/shared';

/**
 * Dados aceitos para criar uma meta. A validação acontece ANTES de chegar no
 * service (ValidationPipe global), então o service só vê dados já sanitizados.
 */
export class CreateGoalDto {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name!: string;

  /** Valor-alvo em centavos (inteiro, positivo). */
  @IsInt()
  @Min(1)
  targetAmountCents!: number;

  @IsOptional()
  @IsEnum(['BRL', 'USD', 'EUR'])
  baseCurrency?: Currency;

  /** Data-alvo opcional, ISO 8601 (ex.: 2027-12-31). */
  @IsOptional()
  @IsISO8601()
  targetDate?: string;
}
