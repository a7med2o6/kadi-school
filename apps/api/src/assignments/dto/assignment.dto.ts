import { IsDateString, IsNumber, IsOptional, IsPositive, IsString, IsUUID, MinLength } from 'class-validator';

export class CreateAssignmentDto {
  @IsUUID()
  classSubjectId!: string;

  @IsString()
  @MinLength(1)
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsDateString()
  dueAt!: string;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  maxScore?: number;
}

export class ListAssignmentsQueryDto {
  @IsOptional()
  @IsUUID()
  classSubjectId?: string;
}
