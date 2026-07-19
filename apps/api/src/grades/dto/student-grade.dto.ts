import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsIn, IsNumber, IsOptional, IsString, IsUUID, Max, Min, ValidateNested } from 'class-validator';

const COMPONENTS = ['QUIZZES', 'MIDTERM', 'FINAL', 'PARTICIPATION'] as const;

export class ListStudentGradesQueryDto {
  @IsOptional()
  @IsUUID()
  classSubjectId?: string;

  @IsOptional()
  @IsUUID()
  studentId?: string;

  @IsOptional()
  @IsString()
  term?: string;
}

class StudentGradeRecordDto {
  @IsUUID()
  studentId!: string;

  @IsIn(COMPONENTS)
  component!: (typeof COMPONENTS)[number];

  @IsNumber()
  @Min(0)
  @Max(1000)
  score!: number;
}

export class BulkUpsertStudentGradesDto {
  @IsUUID()
  classSubjectId!: string;

  @IsString()
  term!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => StudentGradeRecordDto)
  records!: StudentGradeRecordDto[];
}
