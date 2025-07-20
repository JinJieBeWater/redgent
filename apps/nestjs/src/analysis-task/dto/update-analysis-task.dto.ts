import { PartialType } from '@nestjs/mapped-types'
import { CreateAnalysisTaskDto } from './create-analysis-task.dto'
import { IsNotEmpty, IsString } from 'class-validator'

export class UpdateAnalysisTaskDto extends PartialType(CreateAnalysisTaskDto) {
  @IsString()
  @IsNotEmpty()
  id!: string
}
