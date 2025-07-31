import { ReportRouter } from '@core/modules/report/report.router'
import { TaskRouter } from '@core/modules/task/task.router'
import { INestApplication, Injectable } from '@nestjs/common'
import * as trpcExpress from '@trpc/server/adapters/express'

import { createContext, TrpcService } from './trpc.service'

@Injectable()
export class TrpcRouter {
  appTrpcRouter!: ReturnType<typeof this.register>
  constructor(
    private readonly trpcService: TrpcService,
    private readonly taskRouter: TaskRouter,
    private readonly reportRouter: ReportRouter,
  ) {}

  register() {
    return this.trpcService.t.router({
      ...this.taskRouter.apply(),
      ...this.reportRouter.apply(),
    })
  }

  applyMiddleware(app: INestApplication) {
    if (!this.appTrpcRouter) {
      this.appTrpcRouter = this.register()
    }
    app.use(
      `/trpc`,
      trpcExpress.createExpressMiddleware({
        router: this.appTrpcRouter,
        createContext,
      }),
    )
  }
}
