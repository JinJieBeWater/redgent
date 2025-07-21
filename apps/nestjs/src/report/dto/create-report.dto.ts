import { IsNotEmpty, IsNumber, IsObject, IsString } from 'class-validator'

import type { ReportContent } from '@redgent/types/analysis-report'

export class CreateReportDto {
  @IsString()
  @IsNotEmpty()
  taskId!: string

  @IsObject()
  @IsNotEmpty()
  content!: ReportContent

  @IsNumber()
  executionDuration?: number
}
