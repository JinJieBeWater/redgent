import { Test, TestingModule } from '@nestjs/testing'
import { AnalysisReportService } from './analysis-report.service'
import { PrismaService } from '../prisma/prisma.service'

describe('AnalysisReportService', () => {
  let service: AnalysisReportService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AnalysisReportService, PrismaService],
    }).compile()

    service = module.get<AnalysisReportService>(AnalysisReportService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })
})
