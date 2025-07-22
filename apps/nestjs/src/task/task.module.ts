import { Module } from '@nestjs/common'
import { ScheduleModule } from '@nestjs/schedule'

import { PrismaModule } from '../prisma/prisma.module'
import { TaskService } from './task.service'

@Module({
  imports: [ScheduleModule.forRoot(), PrismaModule],
  providers: [TaskService],
  exports: [TaskService],
})
export class TaskModule {}
