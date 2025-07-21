import { TaskStatus as TaskStatusModel } from '@prisma/client'
import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator'

export class CreateTaskDto {
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

  @IsEnum(TaskStatusModel)
  @IsOptional()
  status?: TaskStatusModel
}
