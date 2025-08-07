import { Module } from '@nestjs/common'

import { AiSdkModule } from '../ai-sdk/ai-sdk.module'
import { TaskExecutionModule } from '../task-execution/task-execution.module'
import { TaskScheduleModule } from '../task-schedule/task-schedule.module'
import { TaskAgentController } from './task-agent.controller'
import { TaskAgentService } from './task-agent.service'

@Module({
  imports: [TaskScheduleModule, TaskExecutionModule, AiSdkModule],
  providers: [TaskAgentService],
  controllers: [TaskAgentController],
})
export class TaskAgentModule {}
