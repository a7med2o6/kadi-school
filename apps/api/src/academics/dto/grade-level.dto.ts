import { IsInt, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateGradeLevelDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsInt()
  order!: number;
}

export class UpdateGradeLevelDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsInt()
  order?: number;
}
