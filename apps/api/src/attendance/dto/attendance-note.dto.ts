import { IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

export class CreateAttendanceNoteDto {
  @IsUUID()
  studentId!: string;

  @IsString()
  @MinLength(1)
  body!: string;
}

export class ListAttendanceNotesQueryDto {
  @IsOptional()
  @IsUUID()
  studentId?: string;
}
