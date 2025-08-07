import type { ITrpcRouter } from '@core/processors/trpc/trpc.interface'
import { TrpcService } from '@core/processors/trpc/trpc.service'
import { Injectable } from '@nestjs/common'

import {
  TaskExecutionInputSchema,
  TaskReportStatusInputSchema,
} from './task-execution.dto'
import { TaskExecutionService } from './task-execution.service'

@Injectable()
export class TaskExecutionRouter implements ITrpcRouter {
  constructor(
    private readonly trpcService: TrpcService,
    private readonly taskExecutionService: TaskExecutionService,
  ) {}
  apply() {
    const t = this.trpcService.t
    return {
      taskExecution: t.router({
        isRunning: t.procedure
          .input(TaskExecutionInputSchema)
          .query(async ({ input }) => {
            return await this.taskExecutionService.isRunning(input)
          }),
        reportStatus: t.procedure
          .input(TaskReportStatusInputSchema)
          .query(async ({ input }) => {
            return await this.taskExecutionService.reportStatus(input)
          }),
      }),
    }
  }
}
