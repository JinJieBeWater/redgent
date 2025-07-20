import { PartialType } from '@nestjs/mapped-types'
import { IsNotEmpty, IsString } from 'class-validator'

import { CreateAnalysisTaskDto } from './create-analysis-task.dto'

export class UpdateAnalysisTaskDto extends PartialType(CreateAnalysisTaskDto) {
  @IsString()
  @IsNotEmpty()
  id!: string
}
