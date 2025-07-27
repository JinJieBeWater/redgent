import { Module } from '@nestjs/common'
import { ScheduleModule } from '@nestjs/schedule'

import { TaskExecutionModule } from '../task-execution/task-execution.module'
import { TaskScheduleService } from './task-schedule.service'

@Module({
  imports: [ScheduleModule.forRoot(), TaskExecutionModule],
  providers: [TaskScheduleService],
  exports: [TaskScheduleService],
})
export class TaskScheduleModule {}
