import { IsDateString, IsEmail, IsIn, IsOptional, IsString, MinLength } from 'class-validator';

const EMPLOYMENT_TYPES = ['full_time', 'part_time', 'contract'] as const;

export class CreateTeacherDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsString()
  @MinLength(1)
  employeeNumber!: string;

  @IsDateString()
  hireDate!: string;

  @IsOptional()
  @IsIn(EMPLOYMENT_TYPES)
  employmentType?: (typeof EMPLOYMENT_TYPES)[number];

  @IsOptional()
  @IsString()
  department?: string;
}

export class UpdateTeacherDto {
  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsIn(EMPLOYMENT_TYPES)
  employmentType?: (typeof EMPLOYMENT_TYPES)[number];

  @IsOptional()
  @IsString()
  department?: string;
}
