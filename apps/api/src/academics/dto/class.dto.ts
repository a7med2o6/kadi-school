import { IsInt, IsOptional, IsString, IsUUID, Min, MinLength } from 'class-validator';

export class CreateClassDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsUUID()
  gradeLevelId!: string;

  @IsUUID()
  academicYearId!: string;

  @IsOptional()
  @IsUUID()
  homeroomTeacherId?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  capacity?: number;
}

export class UpdateClassDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsUUID()
  gradeLevelId?: string;

  @IsOptional()
  @IsUUID()
  academicYearId?: string;

  @IsOptional()
  @IsUUID()
  homeroomTeacherId?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  capacity?: number;
}
