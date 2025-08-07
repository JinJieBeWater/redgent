import { ReportModule } from '@core/modules/report/report.module'
import { TaskExecutionModule } from '@core/modules/task-execution/task-execution.module'
import { TaskModule } from '@core/modules/task/task.module'
import { Global, Module } from '@nestjs/common'

import { TrpcRouter } from './trpc.router'
import { TrpcService } from './trpc.service'

@Module({
  imports: [TaskModule, ReportModule, TaskExecutionModule],
  providers: [TrpcService, TrpcRouter],
  exports: [TrpcService, TrpcRouter],
})
@Global()
export class TrpcModule {}
