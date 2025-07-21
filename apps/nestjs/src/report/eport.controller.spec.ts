import { Test, TestingModule } from '@nestjs/testing'

import { createMockContext } from '../prisma/context'
import { PrismaService } from '../prisma/prisma.service'
import { ReportController } from './report.controller'
import { ReportService } from './report.service'

describe('ReportController', () => {
  let controller: ReportController

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReportController],
      providers: [
        ReportService,
        {
          provide: PrismaService,
          useValue: createMockContext().prisma,
        },
      ],
    }).compile()

    controller = module.get<ReportController>(ReportController)
  })

  it('应该被正确定义', () => {
    expect(controller).toBeDefined()
  })
})
