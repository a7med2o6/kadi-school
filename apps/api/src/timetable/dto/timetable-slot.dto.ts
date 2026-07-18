import { IsInt, IsOptional, IsString, IsUUID, Matches, Max, Min } from 'class-validator';

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

export class CreateTimetableSlotDto {
  @IsUUID()
  classSubjectId!: string;

  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek!: number;

  @IsString()
  @Matches(TIME_PATTERN, { message: 'startTime must be in HH:mm format' })
  startTime!: string;

  @IsString()
  @Matches(TIME_PATTERN, { message: 'endTime must be in HH:mm format' })
  endTime!: string;

  @IsOptional()
  @IsString()
  room?: string;
}

export class UpdateTimetableSlotDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek?: number;

  @IsOptional()
  @IsString()
  @Matches(TIME_PATTERN, { message: 'startTime must be in HH:mm format' })
  startTime?: string;

  @IsOptional()
  @IsString()
  @Matches(TIME_PATTERN, { message: 'endTime must be in HH:mm format' })
  endTime?: string;

  @IsOptional()
  @IsString()
  room?: string;
}
