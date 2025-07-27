import { ReportModule } from '@core/modules/report/report.module'
import { Global, Module } from '@nestjs/common'

import { TrpcRouter } from './trpc.router'
import { TrpcService } from './trpc.service'

@Module({
  imports: [ReportModule],
  providers: [TrpcService, TrpcRouter],
  exports: [TrpcService],
})
@Global()
export class TrpcModule {}
