import { EeModule } from '@core/processors/ee/ee.module'
import { CacheModule } from '@nestjs/cache-manager'
import { Test, TestingModule } from '@nestjs/testing'

import { PrismaModule } from '../../processors/prisma/prisma.module'
import { TaskExecutionModule } from '../task-execution/task-execution.module'
import { TaskScheduleModule } from '../task-schedule/task-schedule.module'
import { TaskAgentService } from './task-agent.service'

describe('TaskAgentService', () => {
  let service: TaskAgentService

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
        EeModule,
      ],
      providers: [TaskAgentService],
    }).compile()

    service = module.get<TaskAgentService>(TaskAgentService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })
})
