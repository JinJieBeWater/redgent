import { PrismaModule } from '@core/processors/prisma/prisma.module'
import { Module } from '@nestjs/common'

import { ReportController } from './report.controller'
import { ReportService } from './report.service'

@Module({
  imports: [PrismaModule],
  controllers: [ReportController],
  providers: [ReportService],
  exports: [ReportService],
})
export class ReportModule {}
