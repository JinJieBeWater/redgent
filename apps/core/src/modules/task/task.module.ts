import { Module } from '@nestjs/common'

import { TaskRouter } from './task.router'
import { TaskService } from './task.service'

@Module({
  providers: [TaskService, TaskRouter],
  exports: [TaskService, TaskRouter],
})
export class TaskModule {}
