import { IsNotEmpty, IsString, IsObject, IsNumber } from 'class-validator'
import type { AnalysisReport } from '@redgent/types/analysis-report'

export class CreateAnalysisReportDto {
  @IsString()
  @IsNotEmpty()
  taskId: string

  @IsObject()
  @IsNotEmpty()
  content: AnalysisReport

  @IsNumber()
  executionDuration?: number
}
