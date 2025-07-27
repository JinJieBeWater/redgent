import { Module } from '@nestjs/common'

import { PrismaModule } from '@/processors/prisma/prisma.module'

import { ReportController } from './report.controller'
import { ReportService } from './report.service'

@Module({
  imports: [PrismaModule],
  controllers: [ReportController],
  providers: [ReportService],
  exports: [ReportService],
})
export class ReportModule {}
