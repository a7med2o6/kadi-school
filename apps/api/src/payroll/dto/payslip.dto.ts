import { IsIn, IsOptional, IsString, IsUUID, Matches } from 'class-validator';

const STATUSES = ['DRAFT', 'FINALIZED', 'PAID'] as const;

export class GeneratePayslipsDto {
  @IsString()
  @Matches(/^\d{4}-\d{2}$/, { message: 'periodMonth must be in YYYY-MM format' })
  periodMonth!: string;
}

export class ListPayslipsQueryDto {
  @IsOptional()
  @IsUUID()
  teacherId?: string;

  @IsOptional()
  @IsString()
  periodMonth?: string;

  @IsOptional()
  @IsIn(STATUSES)
  status?: (typeof STATUSES)[number];
}

export class UpdatePayslipDto {
  @IsIn(STATUSES)
  status!: (typeof STATUSES)[number];
}
