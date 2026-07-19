import { IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

export class CreateStudentDocumentDto {
  @IsUUID()
  studentId!: string;

  @IsString()
  @MinLength(1)
  title!: string;
}

export class ListStudentDocumentsQueryDto {
  @IsOptional()
  @IsUUID()
  studentId?: string;
}
