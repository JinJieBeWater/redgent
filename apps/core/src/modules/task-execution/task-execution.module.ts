import { Module } from '@nestjs/common'

import { AiSdkModule } from '../ai-sdk/ai-sdk.module'
import { RedditModule } from '../reddit/reddit.module'
import { TaskExecutionRouter } from './task-execution.router'
import { TaskExecutionService } from './task-execution.service'

@Module({
  imports: [RedditModule, AiSdkModule],
  providers: [TaskExecutionService, TaskExecutionRouter],
  exports: [TaskExecutionService, TaskExecutionRouter],
})
export class TaskExecutionModule {}
