import { Module } from '@nestjs/common'

import { TaskExecutionModule } from '../task-execution/task-execution.module'
import { TaskScheduleModule } from '../task-schedule/task-schedule.module'
import { TaskAgentController } from './task-agent.controller'
import { TaskAgentService } from './task-agent.service'

@Module({
  imports: [TaskScheduleModule, TaskExecutionModule],
  providers: [TaskAgentService],
  controllers: [TaskAgentController],
})
export class TaskAgentModule {}
