import { TrpcRouter } from '@core/processors/trpc/trpc.interface'
import { TrpcService } from '@core/processors/trpc/trpc.service'
import { Injectable } from '@nestjs/common'

import { DetailSchema, PaginateSchema } from './task.dto'
import { TaskService } from './task.service'

@Injectable()
export class TaskRouter implements TrpcRouter {
  constructor(
    private readonly trpcService: TrpcService,
    private readonly taskService: TaskService,
  ) {}

  apply() {
    const t = this.trpcService.t
    return {
      task: t.router({
        paginate: this.trpcService.t.procedure
          .input(PaginateSchema)
          .query(async ({ input }) => {
            return await this.taskService.paginate(input)
          }),
        detail: t.procedure.input(DetailSchema).query(async ({ input }) => {
          return await this.taskService.detail(input)
        }),
      }),
    }
  }
}
