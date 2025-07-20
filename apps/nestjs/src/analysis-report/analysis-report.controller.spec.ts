import { Test, TestingModule } from '@nestjs/testing'

import { createMockContext } from '../prisma/context'
import { PrismaService } from '../prisma/prisma.service'
import { AnalysisReportController } from './analysis-report.controller'
import { AnalysisReportService } from './analysis-report.service'

describe('AnalysisReportController', () => {
  let controller: AnalysisReportController

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AnalysisReportController],
      providers: [
        AnalysisReportService,
        {
          provide: PrismaService,
          useValue: createMockContext().prisma,
        },
      ],
    }).compile()

    controller = module.get<AnalysisReportController>(AnalysisReportController)
  })

  it('应该被正确定义', () => {
    expect(controller).toBeDefined()
  })
})
