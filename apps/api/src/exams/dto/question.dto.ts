import { IsIn, IsNumber, IsOptional, IsPositive, IsString, IsUUID, MinLength } from 'class-validator';

const DIFFICULTIES = ['EASY', 'MEDIUM', 'HARD'] as const;

export class CreateQuestionDto {
  @IsUUID()
  subjectId!: string;

  @IsString()
  @MinLength(1)
  body!: string;

  @IsIn(DIFFICULTIES)
  difficulty!: (typeof DIFFICULTIES)[number];

  @IsOptional()
  @IsNumber()
  @IsPositive()
  points?: number;
}

export class ListQuestionsQueryDto {
  @IsOptional()
  @IsUUID()
  subjectId?: string;

  @IsOptional()
  @IsIn(DIFFICULTIES)
  difficulty?: (typeof DIFFICULTIES)[number];
}
