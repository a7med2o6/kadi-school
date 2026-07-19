import { IsIn, IsString, IsUUID, MinLength, ValidateIf } from 'class-validator';

const TARGET_TYPES = ['ROLE', 'CLASS', 'INDIVIDUAL'] as const;

export class CreateNotificationDto {
  @IsString()
  @MinLength(1)
  title!: string;

  @IsString()
  @MinLength(1)
  body!: string;

  @IsIn(TARGET_TYPES)
  targetType!: (typeof TARGET_TYPES)[number];

  @ValidateIf((o) => o.targetType === 'ROLE')
  @IsUUID()
  targetRoleId?: string;

  @ValidateIf((o) => o.targetType === 'CLASS')
  @IsUUID()
  targetClassId?: string;

  @ValidateIf((o) => o.targetType === 'INDIVIDUAL')
  @IsUUID()
  targetUserId?: string;
}
