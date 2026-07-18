import { IsOptional, IsUUID } from 'class-validator';

export class CreateClassSubjectDto {
  @IsUUID()
  classId!: string;

  @IsUUID()
  subjectId!: string;

  @IsOptional()
  @IsUUID()
  teacherId?: string;
}

export class UpdateClassSubjectDto {
  @IsOptional()
  @IsUUID()
  teacherId?: string;
}
