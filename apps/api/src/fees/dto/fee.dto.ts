import { IsDateString, IsNumber, IsOptional, IsPositive, IsString, IsUUID, MinLength } from 'class-validator';

export class CreateFeeInvoiceDto {
  @IsUUID()
  studentId!: string;

  @IsString()
  @MinLength(1)
  title!: string;

  @IsNumber()
  @IsPositive()
  amount!: number;

  @IsDateString()
  dueDate!: string;
}

export class ListFeeInvoicesQueryDto {
  @IsOptional()
  @IsUUID()
  studentId?: string;
}
