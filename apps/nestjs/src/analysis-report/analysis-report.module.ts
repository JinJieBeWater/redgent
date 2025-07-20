import { Module } from '@nestjs/common'

import { PrismaModule } from '../prisma/prisma.module'
import { AnalysisReportController } from './analysis-report.controller'
import { AnalysisReportService } from './analysis-report.service'

@Module({
  imports: [PrismaModule],
  controllers: [AnalysisReportController],
  providers: [AnalysisReportService],
  exports: [AnalysisReportService],
})
export class AnalysisReportModule {}
