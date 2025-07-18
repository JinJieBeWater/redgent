import { Module } from '@nestjs/common'
import { AnalysisReportService } from './analysis-report.service'
import { AnalysisReportController } from './analysis-report.controller'
import { PrismaModule } from '../prisma/prisma.module'

@Module({
  imports: [PrismaModule],
  controllers: [AnalysisReportController],
  providers: [AnalysisReportService],
  exports: [AnalysisReportService],
})
export class AnalysisReportModule {}
