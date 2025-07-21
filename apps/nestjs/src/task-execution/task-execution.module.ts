import { Module } from '@nestjs/common'

import { PrismaModule } from '../prisma/prisma.module'
import { RedditModule } from '../reddit/reddit.module'
import { ReportModule } from '../report/report'
import { TaskExecutionService } from './task-execution.service'

@Module({
  imports: [RedditModule, ReportModule, PrismaModule],
  providers: [TaskExecutionService],
})
export class TaskExecutionModule {}
