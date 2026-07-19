import { IsDateString, IsIn, IsOptional, IsString, IsUUID } from 'class-validator';

const STATUSES = ['PRESENT', 'LATE', 'ABSENT', 'ON_LEAVE'] as const;

export class ListTeacherAttendanceQueryDto {
  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsUUID()
  teacherId?: string;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}

export class UpsertTeacherAttendanceDto {
  @IsUUID()
  teacherId!: string;

  @IsDateString()
  date!: string;

  @IsIn(STATUSES)
  status!: (typeof STATUSES)[number];

  @IsOptional()
  @IsString()
  checkInTime?: string;

  @IsOptional()
  @IsString()
  checkOutTime?: string;

  @IsOptional()
  @IsString()
  note?: string;
}
