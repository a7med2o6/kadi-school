import { IsBoolean, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

export class LinkGuardianDto {
  @IsUUID()
  studentId!: string;

  @IsUUID()
  parentId!: string;

  @IsString()
  @MinLength(1)
  relationship!: string;

  @IsOptional()
  @IsBoolean()
  isPrimaryContact?: boolean;
}
