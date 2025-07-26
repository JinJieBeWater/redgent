import { Module } from '@nestjs/common'
import { ScheduleModule } from '@nestjs/schedule'

import { PrismaModule } from '../prisma/prisma.module'
import { TaskExecutionModule } from '../task-execution/task-execution.module'
import { TaskScheduleService } from './task-schedule.service'

@Module({
  imports: [ScheduleModule.forRoot(), PrismaModule, TaskExecutionModule],
  providers: [TaskScheduleService],
  exports: [TaskScheduleService],
})
export class TaskScheduleModule {}
