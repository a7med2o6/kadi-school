import { IsDateString, IsNumber, IsObject, IsOptional, IsPositive, IsUUID } from 'class-validator';

export class CreatePayrollStructureDto {
  @IsUUID()
  teacherId!: string;

  @IsNumber()
  @IsPositive()
  baseSalary!: number;

  @IsOptional()
  @IsObject()
  allowances?: Record<string, number>;

  @IsOptional()
  @IsObject()
  deductions?: Record<string, number>;

  @IsDateString()
  effectiveFrom!: string;
}

export class UpdatePayrollStructureDto {
  @IsOptional()
  @IsNumber()
  @IsPositive()
  baseSalary?: number;

  @IsOptional()
  @IsObject()
  allowances?: Record<string, number>;

  @IsOptional()
  @IsObject()
  deductions?: Record<string, number>;

  @IsOptional()
  @IsDateString()
  effectiveFrom?: string;
}
