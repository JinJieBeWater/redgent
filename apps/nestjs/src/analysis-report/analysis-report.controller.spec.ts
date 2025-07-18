import { Test, TestingModule } from '@nestjs/testing'
import { AnalysisReportController } from './analysis-report.controller'
import { AnalysisReportService } from './analysis-report.service'
import { PrismaService } from '../prisma/prisma.service'
import { createMockContext } from '../prisma/context'

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

  it('should be defined', () => {
    expect(controller).toBeDefined()
  })
})
