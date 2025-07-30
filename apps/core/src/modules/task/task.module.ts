import { EventEmitterService } from '@core/processors/event-emitter/event-emitter.service'
import { Module } from '@nestjs/common'

import { TaskRouter } from './task.router'
import { TaskService } from './task.service'

@Module({
  providers: [TaskService, TaskRouter, EventEmitterService],
  exports: [TaskService, TaskRouter],
})
export class TaskModule {}
