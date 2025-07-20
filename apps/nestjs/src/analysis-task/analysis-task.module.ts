import { Module } from '@nestjs/common'
import { ScheduleModule } from '@nestjs/schedule'
import { AnalysisTaskService } from './analysis-task.service'
import { AnalysisTaskExecutionService } from './analysis-task-execution.service'
import { RedditModule } from '../reddit/reddit.module'
import { AiSdkModule } from '../ai-sdk/ai-sdk.module'
import { AnalysisReportModule } from '../analysis-report/analysis-report.module'
import { PrismaModule } from '../prisma/prisma.module'

@Module({
  imports: [
    ScheduleModule.forRoot(),
    RedditModule,
    AiSdkModule,
    AnalysisReportModule,
    PrismaModule,
  ],
  providers: [AnalysisTaskService, AnalysisTaskExecutionService],
})
export class AnalysisTaskModule {}
