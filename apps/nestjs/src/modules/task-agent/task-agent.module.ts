import { Module } from '@nestjs/common'

import { PrismaModule } from '@/prisma/prisma.module'

import { TaskExecutionModule } from '../task-execution/task-execution.module'
import { TaskScheduleModule } from '../task-schedule/task-schedule.module'
import { TaskAgentController } from './task-agent.controller'
import { TaskAgentService } from './task-agent.service'

@Module({
  imports: [PrismaModule, TaskScheduleModule, TaskExecutionModule],
  providers: [TaskAgentService],
  controllers: [TaskAgentController],
})
export class TaskAgentModule {}
