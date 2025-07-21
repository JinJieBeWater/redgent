import { Module } from '@nestjs/common'
import { ScheduleModule } from '@nestjs/schedule'

import { AnalysisReportModule } from '../analysis-report/analysis-report.module'
import { PrismaModule } from '../prisma/prisma.module'
import { RedditModule } from '../reddit/reddit.module'
import { AnalysisTaskExecutionService } from './analysis-task-execution.service'
import { AnalysisTaskService } from './analysis-task.service'

@Module({
  imports: [
    ScheduleModule.forRoot(),
    RedditModule,
    AnalysisReportModule,
    PrismaModule,
  ],
  providers: [AnalysisTaskService, AnalysisTaskExecutionService],
})
export class AnalysisTaskModule {}
