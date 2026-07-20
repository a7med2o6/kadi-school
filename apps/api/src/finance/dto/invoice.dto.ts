import { IsDateString, IsIn, IsNumber, IsOptional, IsPositive, IsString, IsUUID, MinLength } from 'class-validator';

const STATUSES = ['PENDING', 'PARTIAL', 'PAID', 'OVERDUE'] as const;

export class CreateInvoiceDto {
  @IsUUID()
  studentId!: string;

  @IsOptional()
  @IsUUID()
  feeStructureId?: string;

  @IsString()
  @MinLength(1)
  title!: string;

  @IsNumber()
  @IsPositive()
  amountDue!: number;

  @IsDateString()
  dueDate!: string;
}

export class ListInvoicesQueryDto {
  @IsOptional()
  @IsUUID()
  studentId?: string;

  @IsOptional()
  @IsIn(STATUSES)
  status?: (typeof STATUSES)[number];
}
