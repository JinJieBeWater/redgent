import { ScheduleType, TaskStatus as TaskStatusModel } from '@prisma/client'
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

  @IsEnum(ScheduleType)
  @IsNotEmpty()
  scheduleType!: ScheduleType

  @IsString()
  @IsNotEmpty()
  scheduleExpression!: string

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

  @IsEnum(TaskStatusModel)
  @IsOptional()
  status?: TaskStatusModel
}
