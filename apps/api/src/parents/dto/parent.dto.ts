import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateParentDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  occupation?: string;
}

export class UpdateParentDto {
  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  occupation?: string;
}
