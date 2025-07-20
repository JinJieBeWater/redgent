import {
  IsString,
  IsNotEmpty,
  IsArray,
  ArrayNotEmpty,
  IsBoolean,
  IsOptional,
  IsEnum,
} from 'class-validator'
import { AnalysisTaskStatus } from '@prisma/client'

export class CreateAnalysisTaskDto {
  @IsString()
  @IsNotEmpty()
  name!: string

  @IsString()
  @IsNotEmpty()
  cron!: string

  @IsString()
  @IsNotEmpty()
  prompt!: string

  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  keywords!: string[]

  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  subreddits: string[] | undefined

  @IsBoolean()
  @IsOptional()
  enableFiltering?: boolean

  @IsString()
  @IsOptional()
  llmModel?: string

  @IsEnum(AnalysisTaskStatus)
  @IsOptional()
  status?: AnalysisTaskStatus
}
