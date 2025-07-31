import { on } from 'node:events'
import { EeService } from '@core/processors/ee/ee.service'
import { TrpcRouter } from '@core/processors/trpc/trpc.interface'
import { TrpcService } from '@core/processors/trpc/trpc.service'
import { Injectable } from '@nestjs/common'
import { tracked } from '@trpc/server'

import { ExecuteSubscribeOutputSchema } from '@redgent/shared'

import { TASK_EXECUTE_EVENT } from './task.constants'
import {
  DetailSchema,
  ExecuteSubscribeInputSchema,
  ExecuteSubscribeOutputSchemaWithYield,
  PaginateSchema,
} from './task.dto'
import { TaskService } from './task.service'

@Injectable()
export class TaskRouter implements TrpcRouter {
  constructor(
    private readonly trpcService: TrpcService,
    private readonly taskService: TaskService,
    private readonly ee: EeService,
  ) {}

  apply() {
    const t = this.trpcService.t
    const self = this
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
        execute: t.router({
          subscribe: t.procedure
            .input(ExecuteSubscribeInputSchema)
            .output(ExecuteSubscribeOutputSchemaWithYield)
            .subscription(async function* (opts) {
              /** 开始连接 */
              //  检测是否断线重连
              let index = opts.input.lastEventId ?? 0
              if (index > 0) {
                // 根据上次执行的事件id还原数据
              }
              // 等待事件发生 基于事件发送对应数据
              for await (const [data] of on(self.ee, TASK_EXECUTE_EVENT)) {
                // data 类型为 TaskProgress，来自 task-execution 模块的事件
                const res = ExecuteSubscribeOutputSchema.parse(data)
                index++
                yield tracked(String(index), {
                  ...res,
                })
              }
            }),
        }),
      }),
    }
  }
}
