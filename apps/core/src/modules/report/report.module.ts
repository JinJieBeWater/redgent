import { Module } from '@nestjs/common'

import { ReportRouter } from './report.router'
import { ReportService } from './report.service'

@Module({
  providers: [ReportService, ReportRouter],
  exports: [ReportService, ReportRouter],
})
export class ReportModule {}
