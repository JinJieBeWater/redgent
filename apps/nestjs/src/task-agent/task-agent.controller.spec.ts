import { CacheModule } from '@nestjs/cache-manager'
import { Test, TestingModule } from '@nestjs/testing'

import { PrismaModule } from '../prisma/prisma.module'
import { TaskExecutionModule } from '../task-execution/task-execution.module'
import { TaskScheduleModule } from '../task-schedule/task-schedule.module'
import { TaskAgentController } from './task-agent.controller'
import { TaskAgentService } from './task-agent.service'

describe('TaskAgentController', () => {
  let controller: TaskAgentController

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        CacheModule.register({
          ttl: 5000,
          isGlobal: true,
        }),
        PrismaModule,
        TaskScheduleModule,
        TaskExecutionModule,
      ],
      providers: [TaskAgentService],
      controllers: [TaskAgentController],
    }).compile()

    controller = module.get<TaskAgentController>(TaskAgentController)
  })

  it('should be defined', () => {
    expect(controller).toBeDefined()
  })
})
