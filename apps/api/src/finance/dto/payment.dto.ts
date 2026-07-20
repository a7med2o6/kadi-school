import { IsIn, IsNumber, IsOptional, IsPositive, IsString } from 'class-validator';

const METHODS = ['CASH', 'BANK_TRANSFER', 'CARD', 'OTHER'] as const;

export class CreatePaymentDto {
  @IsNumber()
  @IsPositive()
  amount!: number;

  @IsIn(METHODS)
  method!: (typeof METHODS)[number];

  @IsOptional()
  @IsString()
  referenceNumber?: string;
}
