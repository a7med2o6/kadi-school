import { IsDateString, IsEmail, IsIn, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

const GENDERS = ['male', 'female'] as const;
const STATUSES = ['ACTIVE', 'GRADUATED', 'TRANSFERRED', 'WITHDRAWN'] as const;

export class CreateStudentDto {
  @IsString()
  @MinLength(1)
  civilId!: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsString()
  @MinLength(1)
  admissionNumber!: string;

  @IsOptional()
  @IsUUID()
  classId?: string;

  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @IsOptional()
  @IsIn(GENDERS)
  gender?: (typeof GENDERS)[number];

  @IsOptional()
  @IsString()
  nationality?: string;
}

export class UpdateStudentDto {
  @IsOptional()
  @IsUUID()
  classId?: string;

  @IsOptional()
  @IsIn(STATUSES)
  status?: (typeof STATUSES)[number];

  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @IsOptional()
  @IsIn(GENDERS)
  gender?: (typeof GENDERS)[number];

  @IsOptional()
  @IsString()
  nationality?: string;
}
