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
 * Atualização parcial de uma meta: todos os campos são opcionais, mas quando
 * presentes seguem as mesmas regras de CreateGoalDto. (Declarados à mão para
 * não acoplar o projeto ao @nestjs/mapped-types nesta fase.)
 */
export class UpdateGoalDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  targetAmountCents?: number;

  @IsOptional()
  @IsEnum(['BRL', 'USD', 'EUR'])
  baseCurrency?: Currency;

  @IsOptional()
  @IsISO8601()
  targetDate?: string;
}
