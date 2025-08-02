import { Module } from '@nestjs/common'

import { RedditModule } from '../reddit/reddit.module'
import { TaskExecutionRouter } from './task-execution.router'
import { TaskExecutionService } from './task-execution.service'

@Module({
  imports: [RedditModule],
  providers: [TaskExecutionService, TaskExecutionRouter],
  exports: [TaskExecutionService, TaskExecutionRouter],
})
export class TaskExecutionModule {}
