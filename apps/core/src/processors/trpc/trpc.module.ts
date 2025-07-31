import { ReportModule } from '@core/modules/report/report.module'
import { TaskModule } from '@core/modules/task/task.module'
import { Global, Module } from '@nestjs/common'

import { TrpcRouter } from './trpc.router'
import { TrpcService } from './trpc.service'

@Module({
  imports: [TaskModule, ReportModule],
  providers: [TrpcService, TrpcRouter],
  exports: [TrpcService, TrpcRouter],
})
@Global()
export class TrpcModule {}
