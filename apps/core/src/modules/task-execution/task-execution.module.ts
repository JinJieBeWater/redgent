import { Module } from '@nestjs/common'

import { RedditModule } from '../reddit/reddit.module'
import { TaskExecutionService } from './task-execution.service'

@Module({
  imports: [RedditModule],
  providers: [TaskExecutionService],
  exports: [TaskExecutionService],
})
export class TaskExecutionModule {}
