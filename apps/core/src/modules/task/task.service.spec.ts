import { PrismaService } from '@core/processors/prisma/prisma.service'
import { Test, TestingModule } from '@nestjs/testing'

import { TaskService } from './task.service'

describe('TaskService', () => {
  let service: TaskService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PrismaService, TaskService],
    }).compile()

    service = module.get<TaskService>(TaskService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })
})
