import { IsDateString, IsInt, IsOptional, IsString, IsUUID, Max, Min, MinLength } from 'class-validator';

export class ListExamsQueryDto {
  @IsOptional()
  @IsUUID()
  subjectId?: string;
}

export class ListExamScheduleQueryDto {
  @IsOptional()
  @IsUUID()
  classId?: string;
}

export class GenerateExamDto {
  @IsUUID()
  subjectId!: string;

  @IsOptional()
  @IsUUID()
  classId?: string;

  @IsString()
  @MinLength(1)
  name!: string;

  @IsString()
  @MinLength(1)
  examType!: string;

  @IsDateString()
  examDate!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  questionCount?: number;
}
