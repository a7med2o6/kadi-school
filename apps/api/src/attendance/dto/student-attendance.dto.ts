import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsDateString, IsIn, IsOptional, IsString, IsUUID, ValidateNested } from 'class-validator';

const STATUSES = ['PRESENT', 'LATE', 'ABSENT', 'EXCUSED'] as const;

export class ListStudentAttendanceQueryDto {
  @IsOptional()
  @IsUUID()
  classId?: string;

  @IsOptional()
  @IsUUID()
  studentId?: string;

  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}

class StudentAttendanceRecordDto {
  @IsUUID()
  studentId!: string;

  @IsIn(STATUSES)
  status!: (typeof STATUSES)[number];

  @IsOptional()
  @IsString()
  arrivalTime?: string;

  @IsOptional()
  @IsString()
  note?: string;
}

export class BulkUpsertStudentAttendanceDto {
  @IsUUID()
  classId!: string;

  @IsDateString()
  date!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => StudentAttendanceRecordDto)
  records!: StudentAttendanceRecordDto[];
}
