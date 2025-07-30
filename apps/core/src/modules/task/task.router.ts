import { on } from 'events'
import { EventEmitterService } from '@core/processors/event-emitter/event-emitter.service'
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
    private readonly ee: EventEmitterService,
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
          this.ee.emit('task.execute', input)
          return await this.taskService.detail(input)
        }),
        execute: t.procedure.subscription(async function* (opts) {
          // listen for new events
          for await (const [data] of on(self.ee, 'task.execute', {
            // Passing the AbortSignal from the request automatically cancels the event emitter when the request is aborted
            signal: opts.signal,
          })) {
            // const post = data as Post
            yield data
          }
        }),
      }),
    }
  }
}
