import { IsNotEmpty, IsNumber, IsObject, IsString } from 'class-validator'

import type { AnalysisReportContent } from '@redgent/types/analysis-report'

export class CreateAnalysisReportDto {
  @IsString()
  @IsNotEmpty()
  taskId!: string

  @IsObject()
  @IsNotEmpty()
  content!: AnalysisReportContent

  @IsNumber()
  executionDuration?: number
}
