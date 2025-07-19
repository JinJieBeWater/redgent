import { Module } from '@nestjs/common'
import { ScheduleModule } from '@nestjs/schedule'
import { AnalysisTaskSchedulerService } from './analysis-task-scheduler.service'
import { AnalysisTaskExecutionService } from './analysis-task-execution.service'
import { RedditModule } from '../reddit/reddit.module'
import { AiSdkModule } from '../ai-sdk/ai-sdk.module'
import { AnalysisReportModule } from '../analysis-report/analysis-report.module'
import { MonitoringModule } from '../monitoring/monitoring.module'

@Module({
  imports: [
    ScheduleModule.forRoot(),
    RedditModule,
    AiSdkModule,
    AnalysisReportModule,
    MonitoringModule,
  ],
  providers: [AnalysisTaskSchedulerService, AnalysisTaskExecutionService],
})
export class AnalysisTaskModule {}
