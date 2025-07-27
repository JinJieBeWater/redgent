import { Module } from '@nestjs/common'

import { PrismaModule } from '@/prisma/prisma.module'

import { RedditModule } from '../reddit/reddit.module'
import { TaskExecutionService } from './task-execution.service'

@Module({
  imports: [RedditModule, PrismaModule],
  providers: [TaskExecutionService],
  exports: [TaskExecutionService],
})
export class TaskExecutionModule {}
