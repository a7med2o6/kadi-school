import { IsIn, IsNumber, IsOptional, IsPositive, IsString, IsUUID, MinLength } from 'class-validator';

const FREQUENCIES = ['MONTHLY', 'TERM', 'ANNUAL'] as const;

export class CreateFeeStructureDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsOptional()
  @IsUUID()
  classId?: string;

  @IsNumber()
  @IsPositive()
  amount!: number;

  @IsIn(FREQUENCIES)
  frequency!: (typeof FREQUENCIES)[number];

  @IsOptional()
  @IsUUID()
  academicYearId?: string;
}

export class UpdateFeeStructureDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsUUID()
  classId?: string;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  amount?: number;

  @IsOptional()
  @IsIn(FREQUENCIES)
  frequency?: (typeof FREQUENCIES)[number];

  @IsOptional()
  @IsUUID()
  academicYearId?: string;
}
