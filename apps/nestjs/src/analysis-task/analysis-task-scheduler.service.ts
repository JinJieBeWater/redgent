import { Injectable, Logger } from '@nestjs/common'
import { AnalysisTaskExecutionService } from './analysis-task-execution.service'

@Injectable()
export class AnalysisTaskSchedulerService {
  private readonly logger = new Logger(AnalysisTaskSchedulerService.name)

  constructor(
    private readonly taskExecutionService: AnalysisTaskExecutionService,
  ) {}
}
