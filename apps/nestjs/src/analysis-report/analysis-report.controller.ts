import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common'

import { AnalysisReportService } from './analysis-report.service'

@Controller('analysis')
export class AnalysisReportController {
  constructor(private readonly analysisService: AnalysisReportService) {}

  /**
   * 根据任务ID获取其所有分析结果
   * @param taskId 任务的UUID
   * @returns 该任务的分析结果列表
   */
  @Get('task/:taskId')
  findAllByTaskId(@Param('taskId', ParseUUIDPipe) taskId: string) {
    return this.analysisService.findAllByTaskId(taskId)
  }
}
