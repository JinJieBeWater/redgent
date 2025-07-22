import { Module } from '@nestjs/common'
import { ScheduleModule } from '@nestjs/schedule'

import { PrismaModule } from '../prisma/prisma.module'
import { TaskScheduleService } from './task-schedule.service'

@Module({
  imports: [ScheduleModule.forRoot(), PrismaModule],
  providers: [TaskScheduleService],
  exports: [TaskScheduleService],
})
export class TaskScheduleModule {}
