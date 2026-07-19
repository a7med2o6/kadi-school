import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsBoolean, IsNumber, IsOptional, IsString, IsUUID, Min, ValidateNested } from 'class-validator';

class SubmissionRecordDto {
  @IsUUID()
  studentId!: string;

  @IsBoolean()
  submitted!: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  score?: number;

  @IsOptional()
  @IsString()
  feedback?: string;
}

export class BulkUpsertSubmissionsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => SubmissionRecordDto)
  records!: SubmissionRecordDto[];
}
